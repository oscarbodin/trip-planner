-- Trip Planner D1 Schema
-- Run with: wrangler d1 execute trip-planner-db --file=schema.sql

DROP TABLE IF EXISTS stops;

CREATE TABLE stops (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  order_num             INTEGER NOT NULL,
  name                  TEXT NOT NULL,
  type                  TEXT,                  -- Hotel, Airbnb, Campsite, Attraction, etc.
  address               TEXT,
  checkin               TEXT,                  -- ISO format: 2026-07-10 15:00
  checkout              TEXT,                  -- ISO format: 2026-07-12 11:00
  nights                INTEGER,
  cancellation_deadline TEXT,                  -- ISO format: 2026-07-05
  price                 REAL,
  currency              TEXT DEFAULT 'EUR',
  payment_status        TEXT DEFAULT 'Pay on arrival',  -- Paid | Pay on arrival | Partially paid
  booking_ref           TEXT,
  booking_url           TEXT,
  phone                 TEXT,
  distance_to_next_km   INTEGER,
  notes                 TEXT,
  image_url             TEXT
);

CREATE INDEX idx_stops_order ON stops(order_num);
