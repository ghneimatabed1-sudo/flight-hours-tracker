-- Migration: Add cloud sync tables for pilot flight backup
-- Run after 0000_elite_eternals.sql

CREATE TABLE `pilot_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `deviceId` varchar(128) NOT NULL,
  `licenseHash` varchar(64) NOT NULL,
  `username` varchar(255),
  `firstSeenAt` timestamp NOT NULL DEFAULT (now()),
  `lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pilot_devices_deviceId_unique` (`deviceId`)
);

CREATE TABLE `synced_flights` (
  `id` int NOT NULL AUTO_INCREMENT,
  `deviceId` varchar(128) NOT NULL,
  `flightId` varchar(128) NOT NULL,
  `flightData` json NOT NULL,
  `clientUpdatedAt` timestamp NOT NULL,
  `deleted` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `synced_flights_device_flight_unique` (`deviceId`, `flightId`),
  KEY `synced_flights_deviceId_idx` (`deviceId`)
);
