import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, pilotDevices, syncedFlights, type InsertPilotDevice, type InsertSyncedFlight } from "../drizzle/schema";
import { ENV } from "./_core/env";
import type { Flight } from "../types/flight";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Pilot Device helpers ────────────────────────────────────────────────────

/**
 * Register or update a pilot device record.
 * Called on every sync so lastSeenAt stays fresh.
 */
export async function upsertPilotDevice(device: InsertPilotDevice): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert pilot device: database not available");
    return;
  }
  await db
    .insert(pilotDevices)
    .values(device)
    .onDuplicateKeyUpdate({
      set: {
        licenseHash: device.licenseHash,
        username: device.username,
        lastSeenAt: new Date(),
      },
    });
}

/**
 * Verify that a deviceId + licenseHash pair exists in the database.
 * Returns the device record if found, undefined otherwise.
 */
export async function getPilotDevice(deviceId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(pilotDevices)
    .where(eq(pilotDevices.deviceId, deviceId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Synced Flight helpers ───────────────────────────────────────────────────

/**
 * Upsert a batch of flights for a device.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE so the same flight ID is never duplicated.
 */
export async function upsertFlights(deviceId: string, flights: Flight[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert flights: database not available");
    return;
  }
  if (flights.length === 0) return;

  for (const flight of flights) {
    const row: InsertSyncedFlight = {
      deviceId,
      flightId: flight.id,
      flightData: flight as unknown as Record<string, unknown>,
      clientUpdatedAt: new Date(flight.updatedAt),
      deleted: false,
    };
    await db
      .insert(syncedFlights)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          flightData: row.flightData,
          clientUpdatedAt: row.clientUpdatedAt,
          deleted: false,
          updatedAt: new Date(),
        },
      });
  }
}

/**
 * Soft-delete a batch of flight IDs for a device.
 */
export async function deleteFlightsOnServer(deviceId: string, flightIds: string[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  for (const flightId of flightIds) {
    await db
      .update(syncedFlights)
      .set({ deleted: true, updatedAt: new Date() })
      .where(and(eq(syncedFlights.deviceId, deviceId), eq(syncedFlights.flightId, flightId)));
  }
}

/**
 * Return all non-deleted flights for a device.
 */
export async function getFlightsForDevice(deviceId: string): Promise<Flight[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(syncedFlights)
    .where(and(eq(syncedFlights.deviceId, deviceId), eq(syncedFlights.deleted, false)));
  return rows.map((r) => r.flightData as unknown as Flight);
}
