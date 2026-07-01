-- Demo seed data for prototype recordings.
-- Run this AFTER migrations and AFTER creating/signing up at least one Supabase Auth user.
-- It seeds the first profile from public.users. It only resets the demo records listed below.

DO $$
DECLARE
  v_user_id UUID;
  v_labour_ramesh UUID := uuid_generate_v4();
  v_labour_suresh UUID := uuid_generate_v4();
  v_labour_imran UUID := uuid_generate_v4();
  v_labour_akash UUID := uuid_generate_v4();
  v_labour_vijay UUID := uuid_generate_v4();
  v_liability_supplier UUID := uuid_generate_v4();
  v_liability_contractor UUID := uuid_generate_v4();
  v_liability_lights UUID := uuid_generate_v4();
  v_liability_cleaning UUID := uuid_generate_v4();
BEGIN
  SELECT id INTO v_user_id
  FROM public.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found in public.users. Register/login once first, then run this seed.';
  END IF;

  -- Reset only demo data so repeated runs stay clean.
  DELETE FROM public.bookings WHERE user_id = v_user_id AND mobile_number IN (
    '9876543210','9988776655','9123456789','9765432109','9898989898','9000011111','9111122222','9222233333','9333344444','9444455555','9555566666','9666677777'
  );
  DELETE FROM public.expenses WHERE user_id = v_user_id AND title IN (
    'Electricity Bill','Water Supply','Ground Maintenance','Football Equipment','Cleaning Supplies','Internet Recharge','Security Services','Turf Repair','Refreshment Stock','Online Ads','Flood Light Service','Pest Control'
  );
  DELETE FROM public.labour WHERE user_id = v_user_id AND phone IN ('8888800001','8888800002','8888800003','8888800004','8888800005');
  DELETE FROM public.liabilities WHERE user_id = v_user_id AND person_name IN ('Sports Supplier','Ground Contractor','Flood Light Vendor','Cleaning Agency');
  DELETE FROM public.other_income WHERE user_id = v_user_id AND title IN ('Tournament Sponsorship','Monthly Membership Fees','Summer Camp Revenue','Advertisement Banner','Jersey Partner Fee');
  DELETE FROM public.marketing_campaigns WHERE user_id = v_user_id AND title IN ('Summer Football Camp','Diwali Discount','Inter-Society Tournament','Premium Membership Drive','Weekend Cricket Offer');
  DELETE FROM public.slots WHERE user_id = v_user_id AND time IN ('06:00 AM - 07:00 AM','07:00 AM - 08:00 AM','05:00 PM - 06:00 PM','06:00 PM - 07:00 PM','07:00 PM - 08:00 PM','08:00 PM - 09:00 PM','09:00 PM - 10:00 PM');

  INSERT INTO public.slots (time, duration_minutes, price, is_active, user_id) VALUES
    ('06:00 AM - 07:00 AM', 60, 1200, TRUE, v_user_id),
    ('07:00 AM - 08:00 AM', 60, 1200, TRUE, v_user_id),
    ('05:00 PM - 06:00 PM', 60, 1500, TRUE, v_user_id),
    ('06:00 PM - 07:00 PM', 60, 1800, TRUE, v_user_id),
    ('07:00 PM - 08:00 PM', 60, 2200, TRUE, v_user_id),
    ('08:00 PM - 09:00 PM', 60, 2200, TRUE, v_user_id),
    ('09:00 PM - 10:00 PM', 60, 1800, TRUE, v_user_id);

  -- Bookings intentionally use several repeat customers so Customers + Analytics look realistic.
  INSERT INTO public.bookings (customer_name, mobile_number, area, booking_date, booking_time, sport, amount, payment_status, notes, user_id) VALUES
    ('Rahul Sharma', '9876543210', 'Andheri', CURRENT_DATE - INTERVAL '21 days', '07:00 PM - 08:00 PM', 'Football', 2200, 'paid', 'Corporate team practice', v_user_id),
    ('Rahul Sharma', '9876543210', 'Andheri', CURRENT_DATE - INTERVAL '14 days', '07:00 PM - 08:00 PM', 'Football', 2200, 'paid', 'Repeat evening slot', v_user_id),
    ('Rahul Sharma', '9876543210', 'Andheri', CURRENT_DATE - INTERVAL '7 days', '08:00 PM - 09:00 PM', 'Football', 2200, 'paid', 'Monthly regular customer', v_user_id),
    ('Rahul Sharma', '9876543210', 'Andheri', CURRENT_DATE, '07:00 PM - 08:00 PM', 'Football', 2200, 'paid', 'Today prime slot', v_user_id),
    ('Priya Patel', '9988776655', 'Bandra', CURRENT_DATE, '08:00 PM - 09:00 PM', 'Cricket', 2500, 'pending', 'Pending UPI confirmation', v_user_id),
    ('Amit Verma', '9123456789', 'Powai', CURRENT_DATE + INTERVAL '1 day', '06:00 PM - 07:00 PM', 'Football', 1800, 'paid', 'Birthday match', v_user_id),
    ('Neha Shah', '9765432109', 'Thane', CURRENT_DATE - INTERVAL '1 day', '05:00 PM - 06:00 PM', 'Badminton', 1200, 'paid', 'Coaching batch', v_user_id),
    ('Vikram Singh', '9898989898', 'Borivali', CURRENT_DATE + INTERVAL '2 days', '09:00 PM - 10:00 PM', 'Cricket', 1800, 'pending', 'Advance pending', v_user_id),
    ('Karan Mehta', '9000011111', 'Andheri', CURRENT_DATE - INTERVAL '2 days', '06:00 PM - 07:00 PM', 'Football', 1800, 'paid', 'Office league', v_user_id),
    ('Sana Khan', '9111122222', 'Bandra', CURRENT_DATE - INTERVAL '5 days', '07:00 PM - 08:00 PM', 'Cricket', 2200, 'paid', 'Team tournament prep', v_user_id),
    ('Arjun Nair', '9222233333', 'Powai', CURRENT_DATE + INTERVAL '3 days', '05:00 PM - 06:00 PM', 'Football', 1500, 'paid', 'School alumni match', v_user_id),
    ('Meera Iyer', '9333344444', 'Thane', CURRENT_DATE - INTERVAL '10 days', '08:00 PM - 09:00 PM', 'Badminton', 1600, 'paid', 'Weekend group', v_user_id),
    ('Dev Malhotra', '9444455555', 'Andheri', CURRENT_DATE + INTERVAL '4 days', '07:00 AM - 08:00 AM', 'Football', 1200, 'pending', 'Morning fitness group', v_user_id),
    ('Rohan Joshi', '9555566666', 'Borivali', CURRENT_DATE - INTERVAL '12 days', '06:00 AM - 07:00 AM', 'Cricket', 1200, 'paid', 'Morning net session', v_user_id),
    ('Isha Kapoor', '9666677777', 'Powai', CURRENT_DATE + INTERVAL '6 days', '08:00 PM - 09:00 PM', 'Football', 2200, 'paid', 'Women football league', v_user_id);

  INSERT INTO public.expenses (date, title, description, amount, category, user_id) VALUES
    (CURRENT_DATE - INTERVAL '27 days', 'Electricity Bill', 'Monthly turf floodlight and office electricity bill', 8500, 'Utilities', v_user_id),
    (CURRENT_DATE - INTERVAL '25 days', 'Water Supply', 'Water tanker and washroom usage', 2200, 'Utilities', v_user_id),
    (CURRENT_DATE - INTERVAL '22 days', 'Ground Maintenance', 'Grass brushing, rubber refill and surface inspection', 6000, 'Maintenance', v_user_id),
    (CURRENT_DATE - INTERVAL '20 days', 'Football Equipment', 'Balls, cones, bibs and pump replacement', 4500, 'Equipment', v_user_id),
    (CURRENT_DATE - INTERVAL '18 days', 'Cleaning Supplies', 'Phenyl, mops, gloves and dustbin bags', 1800, 'Cleaning', v_user_id),
    (CURRENT_DATE - INTERVAL '16 days', 'Internet Recharge', 'POS internet and office WiFi', 1200, 'Utilities', v_user_id),
    (CURRENT_DATE - INTERVAL '14 days', 'Security Services', 'Night security contractor payment', 7500, 'Security', v_user_id),
    (CURRENT_DATE - INTERVAL '10 days', 'Turf Repair', 'Net stitching and goal-post alignment', 5200, 'Maintenance', v_user_id),
    (CURRENT_DATE - INTERVAL '8 days', 'Refreshment Stock', 'Water bottles and energy drinks for counter', 3100, 'Inventory', v_user_id),
    (CURRENT_DATE - INTERVAL '6 days', 'Online Ads', 'Instagram ads for weekend slots', 2500, 'Marketing', v_user_id),
    (CURRENT_DATE - INTERVAL '4 days', 'Flood Light Service', 'LED panel inspection and rewiring', 6800, 'Maintenance', v_user_id),
    (CURRENT_DATE - INTERVAL '2 days', 'Pest Control', 'Monthly pest control service', 2000, 'Cleaning', v_user_id);

  INSERT INTO public.labour (id, name, phone, role, user_id) VALUES
    (v_labour_ramesh, 'Ramesh Kumar', '8888800001', 'Ground Manager', v_user_id),
    (v_labour_suresh, 'Suresh Yadav', '8888800002', 'Cleaner', v_user_id),
    (v_labour_imran, 'Imran Shaikh', '8888800003', 'Security', v_user_id),
    (v_labour_akash, 'Akash Patil', '8888800004', 'Coach', v_user_id),
    (v_labour_vijay, 'Vijay Singh', '8888800005', 'Maintenance', v_user_id);

  INSERT INTO public.labour_payments (labour_id, date, amount, remarks, user_id) VALUES
    (v_labour_ramesh, CURRENT_DATE - INTERVAL '30 days', 12000, 'Last month salary', v_user_id),
    (v_labour_ramesh, CURRENT_DATE - INTERVAL '1 day', 12000, 'Current month salary', v_user_id),
    (v_labour_suresh, CURRENT_DATE - INTERVAL '28 days', 8000, 'Cleaning salary', v_user_id),
    (v_labour_suresh, CURRENT_DATE - INTERVAL '3 days', 8000, 'Current month cleaning salary', v_user_id),
    (v_labour_imran, CURRENT_DATE - INTERVAL '27 days', 9500, 'Security salary', v_user_id),
    (v_labour_imran, CURRENT_DATE - INTERVAL '4 days', 9500, 'Night shift payment', v_user_id),
    (v_labour_akash, CURRENT_DATE - INTERVAL '12 days', 5000, 'Coaching batch commission', v_user_id),
    (v_labour_akash, CURRENT_DATE - INTERVAL '2 days', 3500, 'Weekend coaching sessions', v_user_id),
    (v_labour_vijay, CURRENT_DATE - INTERVAL '15 days', 4000, 'Repair work advance', v_user_id),
    (v_labour_vijay, CURRENT_DATE - INTERVAL '5 days', 4500, 'Maintenance work payment', v_user_id);

  INSERT INTO public.liabilities (id, person_name, original_amount, outstanding_amount, description, is_completed, user_id) VALUES
    (v_liability_supplier, 'Sports Supplier', 20000, 12000, 'Bulk footballs, cones and training equipment', FALSE, v_user_id),
    (v_liability_contractor, 'Ground Contractor', 50000, 0, 'Turf repair contractor - fully settled', TRUE, v_user_id),
    (v_liability_lights, 'Flood Light Vendor', 30000, 18000, 'LED replacement pending balance', FALSE, v_user_id),
    (v_liability_cleaning, 'Cleaning Agency', 10000, 6000, 'Deep cleaning package partial pending', FALSE, v_user_id);

  INSERT INTO public.liability_payments (liability_id, amount, date, user_id) VALUES
    (v_liability_supplier, 8000, CURRENT_DATE - INTERVAL '13 days', v_user_id),
    (v_liability_contractor, 50000, CURRENT_DATE - INTERVAL '20 days', v_user_id),
    (v_liability_lights, 12000, CURRENT_DATE - INTERVAL '9 days', v_user_id),
    (v_liability_cleaning, 4000, CURRENT_DATE - INTERVAL '5 days', v_user_id);

  INSERT INTO public.other_income (date, title, description, amount, user_id) VALUES
    (CURRENT_DATE - INTERVAL '18 days', 'Tournament Sponsorship', 'Local brand sponsorship for weekend tournament', 15000, v_user_id),
    (CURRENT_DATE - INTERVAL '12 days', 'Monthly Membership Fees', 'Advance memberships from regular football group', 8000, v_user_id),
    (CURRENT_DATE - INTERVAL '7 days', 'Summer Camp Revenue', 'Kids summer camp registration collection', 25000, v_user_id),
    (CURRENT_DATE - INTERVAL '3 days', 'Advertisement Banner', 'Boundary banner advertisement fee', 5000, v_user_id),
    (CURRENT_DATE - INTERVAL '1 day', 'Jersey Partner Fee', 'Jersey partner contribution for mini league', 6500, v_user_id);

  INSERT INTO public.marketing_campaigns (title, message, campaign_type, sent_at, recipient_count, user_id) VALUES
    ('Summer Football Camp', 'Summer football camp registrations are open. Limited morning and evening batches available.', 'seasonal', NOW() - INTERVAL '10 days', 12, v_user_id),
    ('Diwali Discount', 'Celebrate Diwali with 20% off on advance turf bookings for groups.', 'festival', NOW() - INTERVAL '8 days', 12, v_user_id),
    ('Inter-Society Tournament', 'Register your society team for our weekend knockout tournament.', 'tournament', NOW() - INTERVAL '5 days', 12, v_user_id),
    ('Premium Membership Drive', 'Monthly members get priority slots and exclusive evening discounts.', 'membership', NOW() - INTERVAL '3 days', 12, v_user_id),
    ('Weekend Cricket Offer', 'Book Saturday or Sunday morning cricket slots and get refreshments included.', 'custom', NOW() - INTERVAL '1 day', 12, v_user_id);

  RAISE NOTICE 'Demo seed completed for user %', v_user_id;
END $$;
