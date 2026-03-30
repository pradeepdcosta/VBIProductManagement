-- CreateTable
CREATE TABLE "cost_allocations" (
    "id" SERIAL NOT NULL,
    "service_tower" TEXT NOT NULL,
    "service_offering" TEXT NOT NULL,
    "fy" TEXT NOT NULL DEFAULT 'FY26',
    "ps_opex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ps_dep" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ps_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ppe_opex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ppe_dep" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ppe_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_product_opex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_product_dep" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_product" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commercial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vbts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enterprise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carrier" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "networks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vsol" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "directorate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grand_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fte_count" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fte_breakdown" JSONB,

    CONSTRAINT "cost_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_actions" (
    "id" SERIAL NOT NULL,
    "service_offering" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "savings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "owner" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cost_allocations_service_offering_fy_key" ON "cost_allocations"("service_offering", "fy");
