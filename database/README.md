# VizLoop Data Model

This schema is the production-ready starting point for the guidebook backend. It assumes a managed identity provider such as Supabase Auth owns user identity, while VizLoop stores learning profile, progress, assessment, and game telemetry.

Apply migrations in order from `database/migrations`. Server-only keys from `.env.example` must stay outside the browser bundle.

Recommended deployment order:

1. Create the managed auth project and Postgres database.
2. Apply `database/migrations/001_initial_schema.sql`.
3. Connect the app API layer with service-role access only on the server.
4. Keep learner-facing reads and writes scoped by authenticated `user_id`.
