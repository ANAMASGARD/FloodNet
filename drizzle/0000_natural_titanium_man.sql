CREATE TABLE "alert_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"dedup_key" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"email_subject" text,
	"email_body" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	CONSTRAINT "alert_events_dedup_key_unique" UNIQUE("dedup_key")
);
--> statement-breakpoint
CREATE TABLE "delivery_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_event_id" uuid NOT NULL,
	"provider" varchar(20) DEFAULT 'plunk' NOT NULL,
	"status" varchar(20) NOT NULL,
	"response_code" integer,
	"response_body" text,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forecast_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"forecast_data" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"risk_level" varchar(20) NOT NULL,
	"confidence" double precision NOT NULL,
	"reasoning" text NOT NULL,
	"lead_time_hours" integer,
	"suggested_action" text,
	"raw_llm_response" jsonb,
	"evaluated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"city" text,
	"region" text,
	"country" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"alerts_enabled" boolean DEFAULT true NOT NULL,
	"quiet_hours_start" integer,
	"quiet_hours_end" integer,
	"severity_threshold" varchar(20) DEFAULT 'moderate' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_assessment_id_risk_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."risk_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_location_id_user_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."user_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_alert_event_id_alert_events_id_fk" FOREIGN KEY ("alert_event_id") REFERENCES "public"."alert_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecast_snapshots" ADD CONSTRAINT "forecast_snapshots_location_id_user_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."user_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_snapshot_id_forecast_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."forecast_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_location_id_user_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."user_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alert_user" ON "alert_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_alert_status" ON "alert_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_delivery_alert" ON "delivery_logs" USING btree ("alert_event_id");--> statement-breakpoint
CREATE INDEX "idx_forecast_location" ON "forecast_snapshots" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_forecast_fetched" ON "forecast_snapshots" USING btree ("fetched_at");--> statement-breakpoint
CREATE INDEX "idx_risk_location" ON "risk_assessments" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_risk_evaluated" ON "risk_assessments" USING btree ("evaluated_at");--> statement-breakpoint
CREATE INDEX "idx_user_locations_user" ON "user_locations" USING btree ("user_id");