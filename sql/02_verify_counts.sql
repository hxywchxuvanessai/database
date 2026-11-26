
/*
    output應該長這樣
    "business_registrations"	1716095
    "gender_equality_violations"	1387
    "labor_standards_violations"	80410
    "labor_standards_new"	406
    "employment_service_violations"	95
    "employment_promotion_violations"	2
    "occupational_safety_violations"	83892
    "occupational_accident_insurance_violations"	80410
    "TOTAL"	1962697
*/

SELECT 'business_registrations' AS table_name,
       COUNT(*) AS total_rows
FROM business_registrations

UNION ALL

SELECT 'gender_equality_violations',
       COUNT(*)
FROM gender_equality_violations

UNION ALL

SELECT 'labor_standards_violations',
       COUNT(*)
FROM labor_standards_violations

UNION ALL

SELECT 'labor_standards_new',
       COUNT(*)
FROM labor_standards_new

UNION ALL

SELECT 'employment_service_violations',
       COUNT(*)
FROM employment_service_violations

UNION ALL

SELECT 'employment_promotion_violations',
       COUNT(*)
FROM employment_promotion_violations

UNION ALL

SELECT 'occupational_safety_violations',
       COUNT(*)
FROM occupational_safety_violations

UNION ALL

SELECT 'occupational_accident_insurance_violations',
       COUNT(*)
FROM occupational_accident_insurance_violations

UNION ALL

SELECT 'TOTAL',
       SUM(total_rows)
FROM (
    SELECT COUNT(*) AS total_rows FROM business_registrations
    UNION ALL
    SELECT COUNT(*) FROM gender_equality_violations
    UNION ALL
    SELECT COUNT(*) FROM labor_standards_violations
    UNION ALL
    SELECT COUNT(*) FROM labor_standards_new
    UNION ALL
    SELECT COUNT(*) FROM employment_service_violations
    UNION ALL
    SELECT COUNT(*) FROM employment_promotion_violations
    UNION ALL
    SELECT COUNT(*) FROM occupational_safety_violations
    UNION ALL
    SELECT COUNT(*) FROM occupational_accident_insurance_violations
) AS counts;


