SELECT
    (SELECT COUNT(DISTINCT tax_id)
     FROM public.business_registrations
     WHERE tax_id ~ '^[0-9]{8}$') AS unique_businesses,
    (SELECT COUNT(*)
     FROM public.penalties_raw) AS penalty_rows;
