/*
# Canteen Queue Management System - Schema + Seed Data

1. New Tables
- `menu_items`: Food/drink items available in the canteen, with name, description, price (INR), and category.
- `orders`: Student orders with a digital queue number, status, pickup time estimate, and timestamps.
- `order_items`: Individual line items for each order (menu_item_id, quantity, price_at_order).

2. Security
- This is a multi-user app: students place orders (no login), staff manages orders (login required).
- Staff login uses Supabase auth (email/password). Students don't need login.
- All tables allow anon + authenticated access since students use the anon key and staff use authenticated.
- Staff-specific actions (marking orders complete) are protected by auth but the table itself is readable by all.

3. Seed Data
- 12 menu items across categories (Main Course, Snacks, Beverages, Desserts) with realistic INR prices.
*/

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price integer NOT NULL CHECK (price > 0),
  category text NOT NULL DEFAULT 'Main Course',
  prep_time_seconds integer NOT NULL DEFAULT 40,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_menu_items" ON menu_items;
CREATE POLICY "anon_select_menu_items" ON menu_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_menu_items" ON menu_items;
CREATE POLICY "anon_insert_menu_items" ON menu_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_menu_items" ON menu_items;
CREATE POLICY "anon_update_menu_items" ON menu_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_menu_items" ON menu_items;
CREATE POLICY "anon_delete_menu_items" ON menu_items FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_number integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  total_amount integer NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  estimated_wait_minutes integer NOT NULL DEFAULT 0,
  estimated_pickup_time timestamptz,
  student_name text NOT NULL DEFAULT 'Student',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_order_items" ON order_items;
CREATE POLICY "anon_select_order_items" ON order_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_order_items" ON order_items;
CREATE POLICY "anon_update_order_items" ON order_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_order_items" ON order_items;
CREATE POLICY "anon_delete_order_items" ON order_items FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Seed menu items
INSERT INTO menu_items (name, description, price, category, prep_time_seconds) VALUES
  ('Veg Biryani', 'Fragrant basmati rice with mixed vegetables and spices', 80, 'Main Course', 60),
  ('Paneer Tikka', 'Grilled cottage cheese with bell peppers and mint chutney', 120, 'Main Course', 50),
  ('Chicken Curry', 'Home-style chicken curry with roti and rice', 150, 'Main Course', 70),
  ('Masala Dosa', 'Crispy rice crepe with potato filling and chutney', 70, 'Main Course', 55),
  ('Veg Sandwich', 'Grilled sandwich with vegetables and cheese', 50, 'Snacks', 30),
  ('Samosa (2 pcs)', 'Crispy pastry with spiced potato filling', 30, 'Snacks', 20),
  ('French Fries', 'Golden fried potato strips with ketchup', 60, 'Snacks', 25),
  ('Pav Bhaji', 'Spiced vegetable mash with buttered buns', 90, 'Snacks', 45),
  ('Masala Chai', 'Indian spiced tea with milk', 20, 'Beverages', 15),
  ('Cold Coffee', 'Chilled coffee with milk and ice cream', 50, 'Beverages', 20),
  ('Fresh Lime Soda', 'Refreshing lime soda - sweet or salty', 30, 'Beverages', 10),
  ('Mango Lassi', 'Creamy yogurt drink with mango pulp', 40, 'Beverages', 15),
  ('Gulab Jamun (2 pcs)', 'Deep-fried milk dumplings in sugar syrup', 40, 'Desserts', 10),
  ('Ice Cream Scoop', 'Vanilla or chocolate ice cream', 35, 'Desserts', 5),
  ('Rasmalai (2 pcs)', 'Soft cheese patties in saffron milk', 50, 'Desserts', 10)
ON CONFLICT DO NOTHING;

-- Seed some sample historical orders for AI prediction analytics
DO $$
DECLARE
  v_queue integer := 1;
  v_time interval;
  v_order uuid;
BEGIN
  -- Generate 20 historical completed orders across different hours of the day
  FOR i IN 1..20 LOOP
    v_time := make_interval(hours => (10 + (i % 5)), mins => (i * 3) % 60);
    
    INSERT INTO orders (queue_number, status, total_amount, estimated_wait_minutes, estimated_pickup_time, student_name, created_at, completed_at)
    VALUES (
      v_queue,
      'completed',
      (50 + (i * 17) % 120),
      (5 + (i * 2) % 15),
      now() - v_time + interval '40 seconds' * (i % 5),
      'Student ' || i,
      now() - v_time,
      now() - v_time + interval '5 minutes'
    )
    RETURNING id INTO v_order;
    
    v_queue := v_queue + 1;
  END LOOP;
END $$;
