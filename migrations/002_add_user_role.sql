ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'citizen';

UPDATE public.users SET role = 'citizen' WHERE role IS NULL OR role = '';
