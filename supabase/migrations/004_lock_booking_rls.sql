-- 004_lock_booking_rls.sql
-- Fix CRITICAL: priced_bookings and bespoke_consultations had FOR ALL USING (true)
-- which allowed any authenticated user to read/write all bookings.
-- New policy: no client-side access. All operations go through API routes
-- using the service role client (which bypasses RLS).

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Service role manages priced_bookings" ON priced_bookings;
DROP POLICY IF EXISTS "Service role manages bespoke_consultations" ON bespoke_consultations;

-- Users can only read their own bookings (by email from JWT)
CREATE POLICY "Users read own bookings"
  ON priced_bookings FOR SELECT
  USING (
    customer_email = (auth.jwt() ->> 'email')
    OR user_id = auth.uid()
  );

-- No INSERT/UPDATE/DELETE for anon-key users.
-- All writes happen via service role client in API routes.

-- Bespoke consultations: same pattern
CREATE POLICY "Users read own consultations"
  ON bespoke_consultations FOR SELECT
  USING (
    customer_email = (auth.jwt() ->> 'email')
  );
