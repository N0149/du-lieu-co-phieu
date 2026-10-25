-- ==============================================================================
-- SQL MIGRATION: KHỞI TẠO BẢNG QUẢN TRỊ ADMIN (NGƯỜI DÙNG & LƯỢT TRUY CẬP)
-- Cách dùng: Copy toàn bộ nội dung file này dán vào SQL Editor trên Supabase Dashboard:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. BẢNG LƯU TRỮ HỒ SƠ NGƯỜI DÙNG (TỰ ĐỘNG ĐỒNG BỘ TỪ AUTH.USERS)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'google',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kích hoạt Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Cho phép đọc hồ sơ người dùng công khai hoặc cho client đã xác thực
DROP POLICY IF EXISTS "Cho phép đọc user_profiles" ON public.user_profiles;
CREATE POLICY "Cho phép đọc user_profiles" ON public.user_profiles
  FOR SELECT USING (true);

-- Cho phép hệ thống ghi hồ sơ người dùng
DROP POLICY IF EXISTS "Cho phép ghi user_profiles" ON public.user_profiles;
CREATE POLICY "Cho phép ghi user_profiles" ON public.user_profiles
  FOR ALL USING (true);

-- 2. TRIGGER TỰ ĐỘNG ĐỒNG BỘ MỖI KHI CÓ USER MỚI HOẶC USER ĐĂNG NHẬP LẠI
CREATE OR REPLACE FUNCTION public.handle_user_sync()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    avatar_url,
    provider,
    created_at,
    last_sign_in_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_app_meta_data->>'provider', 'google'),
    NEW.created_at,
    COALESCE(NEW.last_sign_in_at, NOW())
  )
  ON CONFLICT (id) DO UPDATE SET
    last_sign_in_at = COALESCE(EXCLUDED.last_sign_in_at, NOW()),
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn trigger vào bảng auth.users
DROP TRIGGER IF EXISTS on_auth_user_change ON auth.users;
CREATE TRIGGER on_auth_user_change
  AFTER INSERT OR UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_sync();

-- ĐỒNG BỘ TOÀN BỘ CÁC TÀI KHOẢN ĐÃ CÓ TRƯỚC ĐÓ VÀO BẢNG user_profiles
INSERT INTO public.user_profiles (id, email, full_name, avatar_url, provider, created_at, last_sign_in_at)
SELECT 
  id,
  COALESCE(email, ''),
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(COALESCE(email, ''), '@', 1)),
  raw_user_meta_data->>'avatar_url',
  COALESCE(raw_app_meta_data->>'provider', 'google'),
  created_at,
  COALESCE(last_sign_in_at, created_at)
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- 3. BẢNG LƯU TRỮ LƯỢT XEM TRANG (PAGEVIEWS & TRAFFIC)
CREATE TABLE IF NOT EXISTS public.site_pageviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  visitor_hash TEXT,
  device TEXT DEFAULT 'desktop',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kích hoạt RLS
ALTER TABLE public.site_pageviews ENABLE ROW LEVEL SECURITY;

-- Cho phép thêm lượt xem trang
DROP POLICY IF EXISTS "Cho phép ghi site_pageviews" ON public.site_pageviews;
CREATE POLICY "Cho phép ghi site_pageviews" ON public.site_pageviews
  FOR INSERT WITH CHECK (true);

-- Cho phép đọc lượt xem trang
DROP POLICY IF EXISTS "Cho phép đọc site_pageviews" ON public.site_pageviews;
CREATE POLICY "Cho phép đọc site_pageviews" ON public.site_pageviews
  FOR SELECT USING (true);

-- Tạo Index tăng tốc truy vấn theo thời gian và đường dẫn
CREATE INDEX IF NOT EXISTS idx_pageviews_created_at ON public.site_pageviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pageviews_path ON public.site_pageviews (path);
