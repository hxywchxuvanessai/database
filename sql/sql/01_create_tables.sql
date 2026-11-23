CREATE TABLE public.business_registrations (
    business_address text,
    tax_id text,
    head_office_tax_id text,
    business_name text,
    capital text,
    registered_on text,
    organization_type text,
    uses_uniform_invoice text,
    industry_code text,
    industry_name text,
    industry_code_1 text,
    industry_name_1 text,
    industry_code_2 text,
    industry_name_2 text,
    industry_code_3 text,
    industry_name_3 text
);

CREATE TABLE public.penalties_raw (
    authority text,
    announced_on text,
    decision_on text,
    decision_number text,
    employer_name text,
    violated_law text,
    violation_details text,
    fine_amount text,
    notes text
);
