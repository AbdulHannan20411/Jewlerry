-- =============================================================================
-- 0018: close a gap in migration 0017's restock trigger.
--
-- track_product_restock only *set* restock_count/last_restocked_at when
-- quantity_in_stock increased — it never reset them the rest of the
-- time, so an update that didn't touch quantity_in_stock (or decreased
-- it) could still smuggle an arbitrary restock_count/last_restocked_at
-- through products.Update (unrestricted in the app's Database type,
-- same as most admin-editable tables). These two columns should only
-- ever change via this trigger's own restock detection, never a direct
-- client-supplied value — same defense-in-depth pattern as
-- protect_profile_privileged_columns / protect_review_columns.
-- =============================================================================

create or replace function public.track_product_restock()
returns trigger
language plpgsql
as $$
begin
  if new.quantity_in_stock > old.quantity_in_stock then
    new.restock_count := old.restock_count + 1;
    new.last_restocked_at := now();
  else
    new.restock_count := old.restock_count;
    new.last_restocked_at := old.last_restocked_at;
  end if;
  return new;
end;
$$;
