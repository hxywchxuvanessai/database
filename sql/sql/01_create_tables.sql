
-- ==========================================
-- 1. 違反性別平等工作法
-- ==========================================
CREATE TABLE IF NOT EXISTS gender_equality_violations (
    id BIGSERIAL PRIMARY KEY,
    "主管機關" TEXT,
    "公告日期" TEXT,
    "處分日期" TEXT,
    "處分字號" TEXT,
    "事業單位名稱或負責人" TEXT,
    "違法法規法條" TEXT,
    "違反法規內容" TEXT,
    "罰鍰金額" TEXT,
    "備註說明" TEXT
);

-- ==========================================
-- 2. 違反勞動基準法（完整資料）
-- ==========================================
CREATE TABLE IF NOT EXISTS labor_standards_violations (
    id BIGSERIAL PRIMARY KEY,
    "主管機關" TEXT,
    "公告日期" TEXT,
    "處分日期" TEXT,
    "處分字號" TEXT,
    "事業單位名稱或負責人" TEXT,
    "違法法規法條" TEXT,
    "違反法規內容" TEXT,
    "罰鍰金額" TEXT,
    "備註說明" TEXT
);

-- ==========================================
-- 3. 違反勞動基準法（新版資料）
-- ==========================================
CREATE TABLE IF NOT EXISTS labor_standards_new (
    id BIGSERIAL PRIMARY KEY,
    "項次" TEXT,
    "事業單位名稱" TEXT,
    "違反法令條款" TEXT,
    "違反法規內容" TEXT,
    "處分書文號" TEXT,
    "處分日期" TEXT,
    "罰鍰金額" TEXT,
    "備註" TEXT
);

-- ==========================================
-- 4. 違反就業服務法
-- ==========================================
CREATE TABLE IF NOT EXISTS employment_service_violations (
    id BIGSERIAL PRIMARY KEY,
    "主管機關" TEXT,
    "公告日期" TEXT,
    "處分日期" TEXT,
    "處分字號" TEXT,
    "事業單位名稱或負責人" TEXT,
    "違法法規法條" TEXT,
    "違反法規內容" TEXT,
    "備註說明" TEXT
);

-- ==========================================
-- 5. 違反就業促進法
-- ==========================================
CREATE TABLE IF NOT EXISTS employment_promotion_violations (
    id BIGSERIAL PRIMARY KEY,
    "主管機關" TEXT,
    "公告日期" TEXT,
    "處分日期" TEXT,
    "處分字號" TEXT,
    "事業單位名稱或負責人" TEXT,
    "違法法規法條" TEXT,
    "違反法規內容" TEXT,
    "備註說明" TEXT
);

-- ==========================================
-- 6. 違反職業安全衛生法
-- ==========================================
CREATE TABLE IF NOT EXISTS occupational_safety_violations (
    id BIGSERIAL PRIMARY KEY,
    "主管機關" TEXT,
    "公告日期" TEXT,
    "處分日期" TEXT,
    "處分字號" TEXT,
    "事業單位名稱或負責人" TEXT,
    "違法法規法條" TEXT,
    "違反法規內容" TEXT,
    "罰鍰金額" TEXT,
    "職業災害之罹災人數" TEXT,
    "職業災害之發生日期" TEXT,
    "職業災害之發生地點" TEXT,
    "備註說明" TEXT
);

-- ==========================================
-- 7. 違反職業災害保險及保護法
-- ==========================================
CREATE TABLE IF NOT EXISTS occupational_accident_insurance_violations (
    id BIGSERIAL PRIMARY KEY,
    "主管機關" TEXT,
    "公告日期" TEXT,
    "處分日期" TEXT,
    "處分字號" TEXT,
    "事業單位名稱或負責人" TEXT,
    "違法法規法條" TEXT,
    "違反法規內容" TEXT,
    "處分金額或滯納金" TEXT,
    "備註說明" TEXT
);


-- ==========================================
-- 8. 全國營業（稅籍）登記資料
-- ==========================================

CREATE TABLE IF NOT EXISTS business_registrations (
    id BIGSERIAL PRIMARY KEY,

    business_address TEXT,
    tax_id VARCHAR(20),
    head_office_tax_id VARCHAR(20),
    business_name TEXT,
    capital_amount TEXT,
    establishment_date TEXT,
    organization_type TEXT,
    uses_uniform_invoice TEXT,

    industry_code TEXT,
    industry_name TEXT,

    industry_code_1 TEXT,
    industry_name_1 TEXT,

    industry_code_2 TEXT,
    industry_name_2 TEXT,

    industry_code_3 TEXT,
    industry_name_3 TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立統一編號索引
CREATE INDEX IF NOT EXISTS
idx_business_registrations_tax_id
ON business_registrations(tax_id);

-- 建立公司名稱索引
CREATE INDEX IF NOT EXISTS
idx_business_registrations_name
ON business_registrations(business_name);
