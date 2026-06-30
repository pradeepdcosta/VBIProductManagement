-- CreateTable
CREATE TABLE "npd_epics" (
    "id" SERIAL NOT NULL,
    "initiative_id" TEXT NOT NULL,
    "product_canvas" TEXT,
    "epic_name" TEXT NOT NULL,
    "epic_type" TEXT,
    "description" TEXT,
    "capex" DOUBLE PRECISION,
    "opex" DOUBLE PRECISION,
    "markets_agreed" TEXT,
    "go_live_date_overall" TIMESTAMP(3),
    "go_live_date_per_market" TEXT,
    "risk_level" TEXT NOT NULL DEFAULT 'Medium',
    "sign_off_complete" BOOLEAN NOT NULL DEFAULT false,
    "sign_off_by" TEXT,
    "sign_off_date" TIMESTAMP(3),
    "sign_off_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "npd_epics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npd_epic_activities" (
    "id" SERIAL NOT NULL,
    "epic_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "npd_epic_activities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "npd_epic_activities" ADD CONSTRAINT "npd_epic_activities_epic_id_fkey" FOREIGN KEY ("epic_id") REFERENCES "npd_epics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
