SELECT
    b.tax_id AS 統一編號,
    b.business_name AS 公司名稱,
    b.business_address AS 登記地址,
    p.employer_name AS 裁罰原始名稱,
    p.decision_on AS 處分日期,
    p.violated_law AS 違反法條,
    COALESCE(NULLIF(TRIM(p.fine_amount), ''), '未提供') AS 罰鍰金額
FROM public.business_registrations AS b
JOIN public.penalties_raw AS p
    ON b.business_name = TRIM(
        regexp_replace(TRIM(p.employer_name), '[(（][^()（）]*[)）]$', '')
    )
WHERE b.business_name = '得勝者文教股份有限公司'
ORDER BY p.decision_on DESC;
