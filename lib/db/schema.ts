import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  boolean,
  integer,
  jsonb,
  varchar,
  index,
} from "drizzle-orm/pg-core";

// ─── Users (synced from Clerk on first login) ───
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  alertsEnabled: boolean("alerts_enabled").default(true).notNull(),
  quietHoursStart: integer("quiet_hours_start"), // 0-23 hour
  quietHoursEnd: integer("quiet_hours_end"),     // 0-23 hour
  severityThreshold: varchar("severity_threshold", { length: 20 })
    .default("moderate")
    .notNull(), // low | moderate | high | extreme
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Saved locations per user (multiple allowed) ───
export const userLocations = pgTable(
  "user_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    label: text("label").notNull(),             // "Home", "Office", etc.
    city: text("city"),
    region: text("region"),
    country: text("country"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_user_locations_user").on(table.userId),
  ],
);

// ─── Weather forecast snapshots (fetched by cron) ───
export const forecastSnapshots = pgTable(
  "forecast_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id")
      .references(() => userLocations.id, { onDelete: "cascade" })
      .notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    forecastData: jsonb("forecast_data").notNull(),  // raw OpenWeather response
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_forecast_location").on(table.locationId),
    index("idx_forecast_fetched").on(table.fetchedAt),
  ],
);

// ─── Risk assessments (LLM-evaluated per snapshot) ───
export const riskAssessments = pgTable(
  "risk_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    snapshotId: uuid("snapshot_id")
      .references(() => forecastSnapshots.id, { onDelete: "cascade" })
      .notNull(),
    locationId: uuid("location_id")
      .references(() => userLocations.id, { onDelete: "cascade" })
      .notNull(),
    riskLevel: varchar("risk_level", { length: 20 }).notNull(), // none | low | moderate | high | extreme
    confidence: doublePrecision("confidence").notNull(),         // 0.0 - 1.0
    reasoning: text("reasoning").notNull(),
    leadTimeHours: integer("lead_time_hours"),                   // hours before event
    suggestedAction: text("suggested_action"),
    rawLlmResponse: jsonb("raw_llm_response"),
    evaluatedAt: timestamp("evaluated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_risk_location").on(table.locationId),
    index("idx_risk_evaluated").on(table.evaluatedAt),
  ],
);

// ─── Alert events (approved alerts ready for delivery) ───
export const alertEvents = pgTable(
  "alert_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id")
      .references(() => riskAssessments.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    locationId: uuid("location_id")
      .references(() => userLocations.id, { onDelete: "cascade" })
      .notNull(),
    dedupKey: text("dedup_key").notNull().unique(), // e.g. "{userId}:{locationId}:{forecastWindow}"
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | sent | failed | suppressed
    emailSubject: text("email_subject"),
    emailBody: text("email_body"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    sentAt: timestamp("sent_at"),
  },
  (table) => [
    index("idx_alert_user").on(table.userId),
    index("idx_alert_status").on(table.status),
  ],
);

// ─── Delivery logs (per email send attempt) ───
export const deliveryLogs = pgTable(
  "delivery_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    alertEventId: uuid("alert_event_id")
      .references(() => alertEvents.id, { onDelete: "cascade" })
      .notNull(),
    provider: varchar("provider", { length: 20 }).default("plunk").notNull(),
    status: varchar("status", { length: 20 }).notNull(), // success | failed | retrying
    responseCode: integer("response_code"),
    responseBody: text("response_body"),
    attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_delivery_alert").on(table.alertEventId),
  ],
);
