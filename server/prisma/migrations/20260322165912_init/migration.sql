-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "product_line" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "revenue_model" TEXT NOT NULL DEFAULT 'Subscription',
    "owner" TEXT NOT NULL DEFAULT 'VBI Product Team',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_costs" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "component" TEXT NOT NULL,
    "amount_eur" DOUBLE PRECISION NOT NULL,
    "fy" TEXT NOT NULL,

    CONSTRAINT "product_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npd_stages" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "concept" INTEGER NOT NULL DEFAULT 0,
    "biz_case" INTEGER NOT NULL DEFAULT 0,
    "design" INTEGER NOT NULL DEFAULT 0,
    "gtm" INTEGER NOT NULL DEFAULT 0,
    "sales_enable" INTEGER NOT NULL DEFAULT 0,
    "distribution" INTEGER NOT NULL DEFAULT 0,
    "sla_definition" INTEGER NOT NULL DEFAULT 0,
    "launch" INTEGER NOT NULL DEFAULT 0,
    "owner" TEXT,
    "target_launch" TIMESTAMP(3),

    CONSTRAINT "npd_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_data" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "fy" TEXT NOT NULL,
    "actual_eur" DOUBLE PRECISION NOT NULL,
    "target_eur" DOUBLE PRECISION NOT NULL,
    "py_actual_eur" DOUBLE PRECISION,

    CONSTRAINT "trading_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_coverage" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "country_code" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "country_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_data" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "availability" TEXT NOT NULL,
    "mttr" TEXT NOT NULL,
    "response_time" TEXT NOT NULL,
    "support_hours" TEXT NOT NULL,
    "escalation" TEXT,
    "review_freq" TEXT,

    CONSTRAINT "sla_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_cases" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "npv" DOUBLE PRECISION,
    "irr" DOUBLE PRECISION,
    "payback_months" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "summary" TEXT,

    CONSTRAINT "business_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_requests" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "justification" TEXT,
    "deal_account" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "npd_stages_product_id_key" ON "npd_stages"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "country_coverage_product_id_country_code_key" ON "country_coverage"("product_id", "country_code");

-- CreateIndex
CREATE UNIQUE INDEX "sla_data_product_id_key" ON "sla_data"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_cases_product_id_key" ON "business_cases"("product_id");

-- AddForeignKey
ALTER TABLE "product_costs" ADD CONSTRAINT "product_costs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npd_stages" ADD CONSTRAINT "npd_stages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_data" ADD CONSTRAINT "trading_data_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_coverage" ADD CONSTRAINT "country_coverage_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_data" ADD CONSTRAINT "sla_data_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_cases" ADD CONSTRAINT "business_cases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
