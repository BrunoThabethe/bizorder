ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tradesafe_token_id text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS tradesafe_token_id text;
COMMENT ON COLUMN public.profiles.tradesafe_token_id IS 'TradeSafe buyer token ID managed by backend payment functions';
COMMENT ON COLUMN public.businesses.tradesafe_token_id IS 'TradeSafe seller token ID managed by backend payment functions';