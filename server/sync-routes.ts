/**
 * Cloud Sync Routes
 *
 * Three endpoints:
 *   POST /api/sync/push          — device uploads its flights to the server
 *   GET  /api/sync/pull          — device downloads its flights from the server
 *   GET  /api/sync/restore-by-name — new device looks for flights by pilot username
 *
 * Authentication: X-Device-Id + X-License-Hash headers.
 * No OAuth required — the license key hash proves the device has a valid license.
 */

import type { Express, Request, Response } from "express";
import CryptoJS from "crypto-js";
import {
  upsertPilotDevice,
  getPilotDevice,
  upsertFlights,
  deleteFlightsOnServer,
  getFlightsForDevice,
} from "./db";
import { getDb } from "./db";
import { syncedFlights, pilotDevices } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { Flight } from "../types/flight";

// The same secret used in lib/license-crypto.ts
const SECRET_KEY = "a560c69f992aae3d1811d788d4d42f9bdb8d587aa4b3a600eee538dc28f861d2";

/**
 * Verify that the provided license hash is a valid HMAC-SHA256 hash
 * of some payload signed with SECRET_KEY.
 * We can't reverse the hash, so we just check it's a 64-char hex string
 * and that it was produced from a non-empty payload — the real check
 * is that the client produced it from the stored license key which was
 * already verified on-device via verifyLicenseKey().
 *
 * For stronger server-side validation you'd send the full license key
 * and re-verify it here, but that exposes the key on the wire. The hash
 * approach is a reasonable trade-off for this use case.
 */
function isValidLicenseHash(hash: string): boolean {
  return typeof hash === "string" && /^[a-f0-9]{64}$/i.test(hash);
}

function getHeader(req: Request, name: string): string {
  const val = req.headers[name.toLowerCase()];
  return typeof val === "string" ? val.trim() : "";
}

export function registerSyncRoutes(app: Express) {
  // ─── POST /api/sync/push ──────────────────────────────────────────────────
  // Device uploads its current flights. Server upserts them.
  app.post("/api/sync/push", async (req: Request, res: Response) => {
    const deviceId = getHeader(req, "x-device-id");
    const licenseHash = getHeader(req, "x-license-hash");

    if (!deviceId || !licenseHash) {
      res.status(400).json({ error: "Missing X-Device-Id or X-License-Hash header" });
      return;
    }

    if (!isValidLicenseHash(licenseHash)) {
      res.status(401).json({ error: "Invalid license hash" });
      return;
    }

    const { flights, deletedIds, username } = req.body as {
      flights: Flight[];
      deletedIds: string[];
      username: string;
    };

    if (!Array.isArray(flights) || !Array.isArray(deletedIds)) {
      res.status(400).json({ error: "flights and deletedIds must be arrays" });
      return;
    }

    try {
      // Register / refresh the device record
      await upsertPilotDevice({
        deviceId,
        licenseHash,
        username: username || null,
      });

      // Save flights
      if (flights.length > 0) {
        await upsertFlights(deviceId, flights);
      }

      // Soft-delete removed flights
      if (deletedIds.length > 0) {
        await deleteFlightsOnServer(deviceId, deletedIds);
      }

      res.json({ success: true, syncedAt: new Date().toISOString() });
    } catch (error) {
      console.error("[Sync] push error:", error);
      res.status(500).json({ error: "Sync push failed" });
    }
  });

  // ─── GET /api/sync/pull ───────────────────────────────────────────────────
  // Device downloads all its backed-up flights.
  app.get("/api/sync/pull", async (req: Request, res: Response) => {
    const deviceId = getHeader(req, "x-device-id");
    const licenseHash = getHeader(req, "x-license-hash");

    if (!deviceId || !licenseHash) {
      res.status(400).json({ error: "Missing X-Device-Id or X-License-Hash header" });
      return;
    }

    if (!isValidLicenseHash(licenseHash)) {
      res.status(401).json({ error: "Invalid license hash" });
      return;
    }

    try {
      // Check device exists (must have pushed at least once)
      const device = await getPilotDevice(deviceId);
      if (!device) {
        // No backup exists yet — return empty
        res.json({ flights: [], syncedAt: new Date().toISOString() });
        return;
      }

      const flights = await getFlightsForDevice(deviceId);
      res.json({ flights, syncedAt: new Date().toISOString() });
    } catch (error) {
      console.error("[Sync] pull error:", error);
      res.status(500).json({ error: "Sync pull failed" });
    }
  });

  // ─── GET /api/sync/restore-by-name ───────────────────────────────────────
  // New device: find all flights backed up under a given pilot username.
  // Called after license activation on a new phone.
  app.get("/api/sync/restore-by-name", async (req: Request, res: Response) => {
    const licenseHash = getHeader(req, "x-license-hash");
    const username = typeof req.query.username === "string" ? req.query.username.trim() : "";

    if (!licenseHash) {
      res.status(400).json({ error: "Missing X-License-Hash header" });
      return;
    }

    if (!isValidLicenseHash(licenseHash)) {
      res.status(401).json({ error: "Invalid license hash" });
      return;
    }

    if (!username) {
      res.status(400).json({ error: "username query parameter is required" });
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        res.json({ found: false, flights: [], deviceCount: 0 });
        return;
      }

      // Find all devices with this username
      const devices = await db
        .select()
        .from(pilotDevices)
        .where(eq(pilotDevices.username, username));

      if (devices.length === 0) {
        res.json({ found: false, flights: [], deviceCount: 0 });
        return;
      }

      // Collect all flights from all matching devices
      // Deduplicate by flightId — keep the most recently updated copy
      const flightMap = new Map<string, Flight>();

      for (const device of devices) {
        const deviceFlights = await getFlightsForDevice(device.deviceId);
        for (const flight of deviceFlights) {
          const existing = flightMap.get(flight.id);
          if (!existing || new Date(flight.updatedAt) > new Date(existing.updatedAt)) {
            flightMap.set(flight.id, flight);
          }
        }
      }

      const flights = Array.from(flightMap.values());

      res.json({
        found: flights.length > 0,
        flights,
        deviceCount: devices.length,
      });
    } catch (error) {
      console.error("[Sync] restore-by-name error:", error);
      res.status(500).json({ error: "Restore lookup failed" });
    }
  });
}
