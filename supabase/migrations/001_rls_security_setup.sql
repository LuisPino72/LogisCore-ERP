-- ============================================================
-- LogisCore ERP - RLS and Security Migrations
-- ============================================================
-- This migration sets up Row Level Security policies for all
-- tenant-scoped tables in the LogisCore ERP system.
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Helper Function: Check Tenant Access
-- ============================================================
-- This function checks if the current user has access to a
-- specific tenant's data based on their user_roles entry.
-- ============================================================
CREATE OR REPLACE FUNCTION check_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND (role = 'super_admin' OR tenant_id = target_tenant_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Helper Function: Check Super Admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Products Table RLS
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_tenant_access ON public.products
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

CREATE POLICY products_super_admin_full ON public.products
  FOR ALL TO authenticated
  USING (
    is_super_admin()
  );

-- ============================================================
-- Categories Table RLS
-- ============================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_tenant_access ON public.categories
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- Sales Table RLS
-- ============================================================
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_tenant_access ON public.sales
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- Purchases Table RLS
-- ============================================================
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchases_tenant_access ON public.purchases
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- Recipes Table RLS
-- ============================================================
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY recipes_tenant_access ON public.recipes
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- Production Logs Table RLS
-- ============================================================
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY production_logs_tenant_access ON public.production_logs
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- Suppliers Table RLS
-- ============================================================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_tenant_access ON public.suppliers
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- Employees Table RLS
-- ============================================================
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY employees_tenant_access ON public.employees
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- Suspended Sales Table RLS
-- ============================================================
ALTER TABLE public.suspended_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY suspended_sales_tenant_access ON public.suspended_sales
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- Taxpayer Info Table RLS
-- ============================================================
ALTER TABLE public.taxpayer_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY taxpayer_info_tenant_access ON public.taxpayer_info
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- Customers Table RLS
-- ============================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_tenant_access ON public.customers
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- Invoice Settings Table RLS
-- ============================================================
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_settings_tenant_access ON public.invoice_settings
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- Invoices Table RLS
-- ============================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_tenant_access ON public.invoices
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- Settings Table RLS
-- ============================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_tenant_access ON public.settings
  FOR ALL TO authenticated
  USING (
    check_tenant_access(tenant_id)
  );

-- ============================================================
-- User Roles Table - Only super_admin can manage
-- ============================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can see their own roles
CREATE POLICY user_roles_own_read ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Super admins can manage all roles
CREATE POLICY user_roles_super_admin_manage ON public.user_roles
  FOR ALL TO authenticated
  USING (is_super_admin());

-- ============================================================
-- Tenants Table - Only super_admin can manage
-- ============================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read tenants (for dropdown)
CREATE POLICY tenants_read ON public.tenants
  FOR SELECT TO authenticated
  USING (true);

-- Only super_admin can modify tenants
CREATE POLICY tenants_super_admin_manage ON public.tenants
  FOR ALL TO authenticated
  USING (is_super_admin());

-- ============================================================
-- Indexes for Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_tenant_slug ON public.products(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_slug ON public.categories(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_slug ON public.sales(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_slug ON public.customers(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_slug ON public.invoices(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);

-- ============================================================
-- Comments for Documentation
-- ============================================================
COMMENT ON FUNCTION check_tenant_access IS 'Validates if current user has access to tenant data';
COMMENT ON FUNCTION is_super_admin IS 'Validates if current user is a super_admin';
COMMENT ON POLICY products_tenant_access ON products IS 'Restricts products access to tenant members';
