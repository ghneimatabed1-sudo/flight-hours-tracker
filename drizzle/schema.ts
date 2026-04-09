import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * pilot_devices — one record per activated pilot device.
 * Created automatically on first sync. Identified by device ID from the app.
 */
export const pilotDevices = mysqlTable("pilot_devices", {
  id: int("id").autoincrement().primaryKey(),
  /** The device's unique hardware ID (from lib/device-id.ts) */
  deviceId: varchar("deviceId", { length: 128 }).notNull().unique(),
  /** SHA-256 hash of the license key — proves the device has a valid license */
  licenseHash: varchar("licenseHash", { length: 64 }).notNull(),
  /** Pilot's name from the license key payload */
  username: varchar("username", { length: 255 }),
  firstSeenAt: timestamp("firstSeenAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().onUpdateNow().notNull(),
});

export type PilotDevice = typeof pilotDevices.$inferSelect;
export type InsertPilotDevice = typeof pilotDevices.$inferInsert;

/**
 * synced_flights — cloud backup of all pilot flights.
 * One row per flight per device. Uses JSON column so flight fields can change
 * in the app without requiring a DB migration.
 */
export const syncedFlights = mysqlTable("synced_flights", {
  id: int("id").autoincrement().primaryKey(),
  /** The device that owns this flight */
  deviceId: varchar("deviceId", { length: 128 }).notNull(),
  /** The app's own flight ID (e.g. "flight_1704067200000_abc123def") */
  flightId: varchar("flightId", { length: 128 }).notNull(),
  /** Full Flight object stored as JSON */
  flightData: json("flightData").notNull(),
  /** When the flight was last modified on the device (for conflict resolution) */
  clientUpdatedAt: timestamp("clientUpdatedAt").notNull(),
  /** Soft delete — when the pilot deletes a flight on device, we keep the row */
  deleted: boolean("deleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SyncedFlight = typeof syncedFlights.$inferSelect;
export type InsertSyncedFlight = typeof syncedFlights.$inferInsert;
