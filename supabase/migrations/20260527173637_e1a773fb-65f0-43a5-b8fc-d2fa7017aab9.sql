
CREATE TYPE public.wishlist_item_type AS ENUM ('comic', 'manga', 'book');

CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  type public.wishlist_item_type NOT NULL DEFAULT 'book',
  cover_url TEXT,
  current_price NUMERIC,
  original_price NUMERIC,
  price_source TEXT,
  discount_percent NUMERIC,
  affiliate_url TEXT,
  purchased BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wishlists_user_id ON public.wishlists(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wishlist items"
ON public.wishlists FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own wishlist items"
ON public.wishlists FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own wishlist items"
ON public.wishlists FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own wishlist items"
ON public.wishlists FOR DELETE TO authenticated
USING (auth.uid() = user_id);
