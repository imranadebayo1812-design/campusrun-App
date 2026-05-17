-- Fix: add explicit WITH CHECK policies for admin INSERT on menu tables.
-- PostgreSQL's "FOR ALL USING (expr)" covers SELECT/UPDATE/DELETE but some
-- Supabase/PostgREST versions require an explicit WITH CHECK for INSERT.

-- Menu categories
drop policy if exists "Admins can manage menu categories" on public.menu_categories;
create policy "Admins can manage menu categories"
  on public.menu_categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- Menu items
drop policy if exists "Admins can manage menu items" on public.menu_items;
create policy "Admins can manage menu items"
  on public.menu_items for all
  using (public.is_admin())
  with check (public.is_admin());
