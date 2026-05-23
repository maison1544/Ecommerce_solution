create or replace function public.prevent_cross_profile_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'user_accounts' then
    if exists (select 1 from public.admin_accounts where id = new.id) then
      raise exception 'account cannot exist in both user_accounts and admin_accounts';
    end if;
  elsif tg_table_name = 'admin_accounts' then
    if exists (select 1 from public.user_accounts where id = new.id) then
      raise exception 'account cannot exist in both admin_accounts and user_accounts';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_user_account_admin_overlap on public.user_accounts;
create trigger prevent_user_account_admin_overlap
before insert or update of id on public.user_accounts
for each row
execute function public.prevent_cross_profile_membership();

drop trigger if exists prevent_admin_account_user_overlap on public.admin_accounts;
create trigger prevent_admin_account_user_overlap
before insert or update of id on public.admin_accounts
for each row
execute function public.prevent_cross_profile_membership();

revoke execute on function public.prevent_cross_profile_membership() from public;
revoke execute on function public.prevent_cross_profile_membership() from anon;
revoke execute on function public.prevent_cross_profile_membership() from authenticated;
