-- Seed menu_categories and menu_items from the app's built-in vendor list.
-- Run once in Supabase Dashboard → SQL Editor.
-- Safe to re-run (uses INSERT … ON CONFLICT DO NOTHING).

-- ── B's Chops ──────────────────────────────────────────────────────
with cat as (
  insert into public.menu_categories (vendor_name, name, display_order) values
    ("B's Chops", 'Rice',                   1),
    ("B's Chops", 'Grills & Yam',           2),
    ("B's Chops", 'Fries',                  3),
    ("B's Chops", 'Shawarma',               4),
    ("B's Chops", 'Breakfast',              5),
    ("B's Chops", 'Pasta & Noodles',        6),
    ("B's Chops", 'Burgers & Sandwiches',   7),
    ("B's Chops", 'Extras',                 8),
    ("B's Chops", 'Snacks',                 9),
    ("B's Chops", 'Drinks',                10)
  on conflict do nothing
  returning id, name
)
insert into public.menu_items (vendor_name, category_id, name, price, is_available)
select 'B''s Chops', cat.id, v.name, v.price::numeric, v.available
from (values
  -- Rice
  ('Jollof Rice',              2100, true,  'Rice'),
  ('Chinese Basmati Rice',     2600, true,  'Rice'),
  ('White Rice + Stew',        2700, true,  'Rice'),
  -- Grills & Yam
  ('Boiled Yam & Egg Sauce',   3000, true,  'Grills & Yam'),
  ('Bole & Sauce',             2200, true,  'Grills & Yam'),
  -- Fries
  ('Combo Loaded Fries',       5000, true,  'Fries'),
  ('Chicken & French Fries',   4800, true,  'Fries'),
  ('Loaded Fries',             4000, true,  'Fries'),
  ('Sausage & French Fries',   3000, true,  'Fries'),
  ('Irish Fries',              2000, true,  'Fries'),
  ('Plantain Fries',           1500, true,  'Fries'),
  ('Yam Fries',                1500, true,  'Fries'),
  -- Shawarma
  ('Loaded Large Shawarma',    4000, true,  'Shawarma'),
  ('Chicken Shawarma Large + 3 Sausages', 3600, true, 'Shawarma'),
  ('Chicken Shawarma Medium + 2 Sausages', 2900, true, 'Shawarma'),
  ('Extra Sausage',             700, true,  'Shawarma'),
  -- Breakfast
  ('Pancakes / Waffles + Egg & Cocoa', 4000, true, 'Breakfast'),
  ('Bole, Sauce & Fish',       3500, true,  'Breakfast'),
  ('Akara & Pap',              2500, true,  'Breakfast'),
  ('Pancake & Syrup',          2300, true,  'Breakfast'),
  ('Waffles Plain',            2300, true,  'Breakfast'),
  -- Pasta & Noodles
  ('Penne Pasta Jollof',       3500, true,  'Pasta & Noodles'),
  ('Continental Noodles & Egg',2800, true,  'Pasta & Noodles'),
  ('Veg Jollof Spaghetti',     2400, true,  'Pasta & Noodles'),
  -- Burgers & Sandwiches
  ('Double Chicken Burger',    6400, true,  'Burgers & Sandwiches'),
  ('Double Beef Burger',       6200, true,  'Burgers & Sandwiches'),
  ('Chicken Burger',           3200, true,  'Burgers & Sandwiches'),
  ('Beef Burger',              3000, true,  'Burgers & Sandwiches'),
  ('Chicken Sandwich',         2000, true,  'Burgers & Sandwiches'),
  -- Extras
  ('Peppered Grilled Chicken', 2000, true,  'Extras'),
  ('Cole Slaw',                1000, true,  'Extras'),
  ('Egg Sauce',                1000, true,  'Extras'),
  ('Sausage',                   700, true,  'Extras'),
  ('Boiled Egg',                500, true,  'Extras'),
  -- Snacks
  ('Meat Pie',                 1200, true,  'Snacks'),
  ('Butter Popcorn',           1000, true,  'Snacks'),
  ('Vanilla Popcorn',          1000, true,  'Snacks'),
  -- Drinks
  ('Arizona',                  2500, true,  'Drinks'),
  ('Detila Yoghurt',           2500, true,  'Drinks'),
  ('Slush (Big)',              1500, true,  'Drinks'),
  ('Monster',                  1500, true,  'Drinks'),
  ('Red Bull',                 1500, true,  'Drinks'),
  ('Sosa Big',                 1500, true,  'Drinks'),
  ('Zobo',                     1000, true,  'Drinks'),
  ('Malt',                      800, true,  'Drinks'),
  ('Schweppes Can',             800, true,  'Drinks'),
  ('Fanta / Sprite',            600, true,  'Drinks'),
  ('Coke',                      600, true,  'Drinks'),
  ('Water',                     300, true,  'Drinks')
) as v(name, price, available, cat_name)
join cat on cat.name = v.cat_name
on conflict do nothing;

-- ── Zulkys ─────────────────────────────────────────────────────────
with cat as (
  insert into public.menu_categories (vendor_name, name, display_order) values
    ('Zulkys', 'Mains', 1)
  on conflict do nothing returning id, name
)
insert into public.menu_items (vendor_name, category_id, name, price, is_available)
select 'Zulkys', cat.id, v.name, v.price::numeric, true
from (values
  ('Jollof Rice + Protein',  1700),
  ('Basmati Rice + Chicken', 1800),
  ('Ofada Rice + Sauce',     1500),
  ('Egusi Soup + Swallow',   1600)
) as v(name, price)
cross join cat
on conflict do nothing;

-- ── JAJ Plate ──────────────────────────────────────────────────────
with cat as (
  insert into public.menu_categories (vendor_name, name, display_order) values
    ('JAJ Plate', 'Mains', 1)
  on conflict do nothing returning id, name
)
insert into public.menu_items (vendor_name, category_id, name, price, is_available)
select 'JAJ Plate', cat.id, v.name, v.price::numeric, true
from (values
  ('Rice + Chicken',    1400),
  ('Beans + Plantain',   900),
  ('Fried Plantain',     500),
  ('Yam + Egg',          800)
) as v(name, price)
cross join cat
on conflict do nothing;
