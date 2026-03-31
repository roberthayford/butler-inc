-- Butlers Inc: Pricing tables
-- Creates butler_pricing, urgency_multipliers, butler_services,
-- restructured bookings, and bespoke_consultations tables.

-- Butler pricing configuration per butler type
CREATE TABLE IF NOT EXISTS butler_pricing (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  hourly_rate DECIMAL(10,2) NOT NULL,
  minimum_hours DECIMAL(4,2),
  booking_type TEXT NOT NULL CHECK (booking_type IN ('self_service', 'consultation')),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO butler_pricing (id, name, description, hourly_rate, minimum_hours, booking_type, display_order) VALUES
  ('busy', 'Busy Butler', 'Urgent professional logistics', 50.00, 2.0, 'self_service', 1),
  ('baby', 'Baby Butler', 'School runs & care checks', 55.00, 3.0, 'self_service', 2),
  ('base', 'Base Butler', 'Property & home waiting', 50.00, 2.0, 'self_service', 3),
  ('budget', 'Budget Butler', 'Flexible timing, best rates', 35.00, 1.0, 'self_service', 4),
  ('bougie', 'Bougie Butler', 'Luxury sourcing & experiences', 120.00, NULL, 'consultation', 5),
  ('bespoke', 'Bespoke Butler', 'Custom requests', 120.00, NULL, 'consultation', 6);

-- Urgency multipliers
CREATE TABLE IF NOT EXISTS urgency_multipliers (
  id TEXT PRIMARY KEY,
  label TEXT,
  min_hours_notice DECIMAL(6,2),
  max_hours_notice DECIMAL(6,2),
  multiplier DECIMAL(4,2) NOT NULL,
  display_colour TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO urgency_multipliers (id, label, min_hours_notice, max_hours_notice, multiplier, display_colour) VALUES
  ('same_day', 'Same-day premium', NULL, 12.0, 1.50, 'CC6600'),
  ('next_day', 'Next-day premium', 12.0, 36.0, 1.25, 'CC8800'),
  ('standard', NULL, 36.0, 168.0, 1.00, NULL),
  ('early_bird', 'Early-bird discount', 168.0, NULL, 0.95, '2E8B57');

-- Butler services (task categories per butler type)
CREATE TABLE IF NOT EXISTS butler_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  butler_type TEXT NOT NULL REFERENCES butler_pricing(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Priced bookings table (replaces the old request-only bookings for self-service types)
CREATE TABLE IF NOT EXISTS priced_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT UNIQUE NOT NULL,

  -- Service details
  butler_type TEXT NOT NULL REFERENCES butler_pricing(id),
  service_option TEXT,
  service_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours DECIMAL(4,2) NOT NULL,

  -- Pricing (snapshot at time of booking)
  hourly_rate DECIMAL(10,2) NOT NULL,
  urgency_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  urgency_label TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'gbp',

  -- Customer details
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  additional_notes TEXT,

  -- Payment
  checkout_session_id TEXT,
  payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),

  -- Booking status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),

  -- Auth (optional)
  user_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_priced_bookings_reference ON priced_bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_priced_bookings_email ON priced_bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_priced_bookings_status ON priced_bookings(status);
CREATE INDEX IF NOT EXISTS idx_priced_bookings_date ON priced_bookings(service_date);

-- Bespoke consultation requests
CREATE TABLE IF NOT EXISTS bespoke_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_reference TEXT UNIQUE NOT NULL,

  -- Request details
  butler_type TEXT NOT NULL REFERENCES butler_pricing(id),
  preferred_service_date DATE,
  request_description TEXT NOT NULL,

  -- Consultation call
  consultation_date DATE NOT NULL,
  consultation_time TIME NOT NULL,

  -- Customer details
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,

  -- Deposit (optional)
  deposit_amount DECIMAL(10,2),
  deposit_session_id TEXT,
  deposit_payment_status TEXT DEFAULT 'pending' CHECK (deposit_payment_status IN ('pending', 'paid', 'waived')),

  -- Outcome (filled after consultation)
  quoted_price DECIMAL(10,2),
  final_payment_link TEXT,
  final_payment_status TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'consultation_booked', 'quoted', 'accepted', 'completed', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bespoke_consultations_reference ON bespoke_consultations(consultation_reference);
CREATE INDEX IF NOT EXISTS idx_bespoke_consultations_email ON bespoke_consultations(customer_email);

-- Enable RLS
ALTER TABLE butler_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE urgency_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE butler_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE priced_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bespoke_consultations ENABLE ROW LEVEL SECURITY;

-- Public read access for pricing config
CREATE POLICY "Public read butler_pricing" ON butler_pricing FOR SELECT USING (true);
CREATE POLICY "Public read urgency_multipliers" ON urgency_multipliers FOR SELECT USING (true);
CREATE POLICY "Public read butler_services" ON butler_services FOR SELECT USING (true);

-- Service role can do anything with bookings
CREATE POLICY "Service role manages priced_bookings" ON priced_bookings FOR ALL USING (true);
CREATE POLICY "Service role manages bespoke_consultations" ON bespoke_consultations FOR ALL USING (true);
