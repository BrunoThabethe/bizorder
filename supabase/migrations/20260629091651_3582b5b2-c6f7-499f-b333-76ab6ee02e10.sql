alter table if exists public.orders drop column if exists tradesafe_transaction_id;
alter table if exists public.profiles drop column if exists tradesafe_token_id;
alter table if exists public.businesses drop column if exists tradesafe_token_id;
alter table if exists public.order_payments drop column if exists tradesafe_transaction_id;
alter table if exists public.order_payments drop column if exists tradesafe_allocation_id;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_payments' and column_name = 'provider'
  ) then
    alter table public.order_payments alter column provider drop default;
  end if;
end$$;