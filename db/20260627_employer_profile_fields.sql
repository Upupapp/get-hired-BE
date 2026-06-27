-- Migration: employer profile fields
-- Run once on production: psql -U postgres -d gethired_db -f 20260627_employer_profile_fields.sql

ALTER TABLE gethired.users
  ADD COLUMN IF NOT EXISTS role_title VARCHAR(100),
  ADD COLUMN IF NOT EXISTS department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS short_bio TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_photo_publicly BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_title_publicly BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_bio_publicly BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_linkedin_publicly BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_email_publicly BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_phone_publicly BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_uid ON gethired.users(uid);
