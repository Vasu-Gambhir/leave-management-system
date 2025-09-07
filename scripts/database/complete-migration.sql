-- =====================================================
-- Complete Database Migration Script for Leave Management App
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- Clean up existing schema (optional - uncomment if you want to reset)
-- -- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS admin_requests CASCADE;
-- DROP TABLE IF EXISTS leave_requests CASCADE;
-- DROP TABLE IF EXISTS leave_types CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS organizations CASCADE;

-- =====================================================
-- Enable Required Extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Core Tables
-- =====================================================

-- Organizations table for multi-tenancy
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}',
    admin_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table with profile fields
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'team_member', 'approval_manager')),
    profile_picture TEXT,
    phone VARCHAR(20),
    bio TEXT,
    google_tokens JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email, organization_id)
);

-- Leave types table
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    color VARCHAR(7) DEFAULT '#3B82F6',
    requires_approval BOOLEAN DEFAULT TRUE,
    max_days_per_year INTEGER,
    carry_forward_allowed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, organization_id)
);

-- Leave requests table with approver tracking
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    requested_approver_id UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    calendar_event_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Admin requests table for managing admin access requests
CREATE TABLE IF NOT EXISTS admin_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    target_admin_email VARCHAR(255),
    message TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
    processed_by VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    approval_token UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table for real-time notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Leave types indexes
CREATE INDEX IF NOT EXISTS idx_leave_types_organization_id ON leave_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_types_is_active ON leave_types(is_active);

-- Leave requests indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type_id ON leave_requests(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_requested_approver_id ON leave_requests(requested_approver_id);

-- Admin requests indexes
CREATE INDEX IF NOT EXISTS idx_admin_requests_user_id ON admin_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_requests_organization_id ON admin_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_requests_status ON admin_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_requests_token ON admin_requests(approval_token);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id, read) WHERE read = FALSE;


-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DO $$ 
BEGIN
    -- Organizations trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizations_updated_at') THEN
        CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Users trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Leave types trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_leave_types_updated_at') THEN
        CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON leave_types
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Leave requests trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_leave_requests_updated_at') THEN
        CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Admin requests trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_admin_requests_updated_at') THEN
        CREATE TRIGGER update_admin_requests_updated_at BEFORE UPDATE ON admin_requests
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Notifications trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notifications_updated_at') THEN
        CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

END $$;

-- Function to update admin count when user role changes
CREATE OR REPLACE FUNCTION update_admin_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
        UPDATE organizations 
        SET admin_count = admin_count + 1 
        WHERE id = NEW.organization_id;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        IF OLD.role != 'admin' AND NEW.role = 'admin' THEN
            UPDATE organizations 
            SET admin_count = admin_count + 1 
            WHERE id = NEW.organization_id;
        ELSIF OLD.role = 'admin' AND NEW.role != 'admin' THEN
            UPDATE organizations 
            SET admin_count = GREATEST(admin_count - 1, 0) 
            WHERE id = NEW.organization_id;
        END IF;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' AND OLD.role = 'admin' THEN
        UPDATE organizations 
        SET admin_count = GREATEST(admin_count - 1, 0) 
        WHERE id = OLD.organization_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admin count updates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_admin_count') THEN
        CREATE TRIGGER trigger_update_admin_count
        AFTER INSERT OR UPDATE OF role OR DELETE ON users
        FOR EACH ROW EXECUTE FUNCTION update_admin_count();
    END IF;
END $$;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Disable RLS for all tables (adjust based on your security requirements)
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- Table Comments for Documentation
-- =====================================================

-- Organizations
COMMENT ON TABLE organizations IS 'Multi-tenant organizations';
COMMENT ON COLUMN organizations.domain IS 'Unique domain for organization identification';
COMMENT ON COLUMN organizations.settings IS 'JSON settings for organization preferences';
COMMENT ON COLUMN organizations.admin_count IS 'Cached count of admin users';

-- Users
COMMENT ON TABLE users IS 'System users with Google OAuth integration';
COMMENT ON COLUMN users.google_id IS 'Google OAuth unique identifier';
COMMENT ON COLUMN users.phone IS 'User phone number for contact information';
COMMENT ON COLUMN users.bio IS 'User biography or additional personal information';
COMMENT ON COLUMN users.google_tokens IS 'Stored Google OAuth tokens for calendar integration';

-- Leave Requests
COMMENT ON TABLE leave_requests IS 'Employee leave requests';
COMMENT ON COLUMN leave_requests.requested_approver_id IS 'The user selected to approve this request';
COMMENT ON COLUMN leave_requests.approved_by IS 'The user who actually approved/rejected this request';
COMMENT ON COLUMN leave_requests.calendar_event_id IS 'Google Calendar event ID for integration';

-- Admin Requests
COMMENT ON TABLE admin_requests IS 'Requests for admin access to organizations';
COMMENT ON COLUMN admin_requests.target_admin_email IS 'Email of admin to send request to (null if master)';
COMMENT ON COLUMN admin_requests.message IS 'Optional message from requester';
COMMENT ON COLUMN admin_requests.approval_token IS 'Token for email-based approval links';

-- Notifications
COMMENT ON TABLE notifications IS 'Real-time notifications for users';
COMMENT ON COLUMN notifications.recipient_id IS 'User who receives the notification';
COMMENT ON COLUMN notifications.sender_id IS 'User who triggered the notification (nullable)';
COMMENT ON COLUMN notifications.type IS 'Type of notification for filtering and handling';
COMMENT ON COLUMN notifications.data IS 'JSON data with context like request IDs, dates, etc.';
COMMENT ON COLUMN notifications.read IS 'Whether the notification has been read by recipient';

-- =====================================================
-- Initial Seed Data (Optional - Uncomment if needed)
-- =====================================================

-- Insert sample organization
-- INSERT INTO organizations (name, domain) 
-- VALUES ('Sample Company', 'sample.com')
-- ON CONFLICT (domain) DO NOTHING;

-- Insert default leave types for new organizations
-- WITH org AS (SELECT id FROM organizations WHERE domain = 'sample.com')
-- INSERT INTO leave_types (name, organization_id, color, max_days_per_year)
-- SELECT * FROM (VALUES
--     ('Annual Leave', (SELECT id FROM org), '#3B82F6', 21),
--     ('Sick Leave', (SELECT id FROM org), '#EF4444', 10),
--     ('Personal Leave', (SELECT id FROM org), '#8B5CF6', 5),
--     ('Maternity Leave', (SELECT id FROM org), '#EC4899', 90),
--     ('Paternity Leave', (SELECT id FROM org), '#06B6D4', 14)
-- ) AS t(name, org_id, color, days)
-- ON CONFLICT (name, organization_id) DO NOTHING;

-- =====================================================
-- Migration Complete
-- =====================================================
-- After running this script, your database will be fully set up
-- for the Leave Management Application.
--
-- Next steps:
-- 1. Configure your application's database connection
-- 2. Set up environment variables
-- 3. Run the application
-- =====================================================