ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tradesafe_transaction_id text;
CREATE INDEX IF NOT EXISTS idx_orders_tradesafe_transaction_id ON public.orders(tradesafe_transaction_id);