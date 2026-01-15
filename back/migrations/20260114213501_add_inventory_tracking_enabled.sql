-- Migration 20260114213501: add inventory tracking enabled
-- Description: Adds inventory_tracking_enabled column to tenant table
-- Date: 2026-01-14 21:35:01

ALTER TABLE tenant
ADD COLUMN IF NOT EXISTS inventory_tracking_enabled BOOLEAN DEFAULT FALSE;
