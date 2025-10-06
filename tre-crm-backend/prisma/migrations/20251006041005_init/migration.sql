-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MANAGER', 'AGENT');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('GREEN', 'YELLOW', 'RED', 'CLOSED', 'LOST');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'AGENT',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hire_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "license_number" TEXT,
    "specialties" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "found_by_agent_id" TEXT NOT NULL,
    "assigned_agent_id" TEXT,
    "health_status" "HealthStatus" NOT NULL DEFAULT 'GREEN',
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT NOT NULL DEFAULT 'web_form',
    "prefs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "neighborhoods" TEXT[],
    "beds_min" INTEGER NOT NULL,
    "beds_max" INTEGER NOT NULL,
    "baths_min" INTEGER NOT NULL,
    "baths_max" INTEGER NOT NULL,
    "rent_min" INTEGER NOT NULL,
    "rent_max" INTEGER NOT NULL,
    "sqft_min" INTEGER NOT NULL,
    "sqft_max" INTEGER NOT NULL,
    "amenities" TEXT[],
    "escort_pct" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "send_pct" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "bonus_text" TEXT,
    "specials_text" TEXT,
    "website" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "pricing_last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_statuses" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_steps" (
    "id" TEXT NOT NULL,
    "document_status_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "document_step_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcases" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "listing_ids" TEXT[],
    "message" TEXT,
    "public_slug" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "showcases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_properties" (
    "id" TEXT NOT NULL,
    "showcase_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_properties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "document_statuses_lead_id_key" ON "document_statuses"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_steps_document_status_id_step_number_key" ON "document_steps"("document_status_id", "step_number");

-- CreateIndex
CREATE UNIQUE INDEX "showcases_public_slug_key" ON "showcases"("public_slug");

-- CreateIndex
CREATE UNIQUE INDEX "showcase_properties_showcase_id_property_id_key" ON "showcase_properties"("showcase_id", "property_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_found_by_agent_id_fkey" FOREIGN KEY ("found_by_agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_statuses" ADD CONSTRAINT "document_statuses_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_steps" ADD CONSTRAINT "document_steps_document_status_id_fkey" FOREIGN KEY ("document_status_id") REFERENCES "document_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_document_step_id_fkey" FOREIGN KEY ("document_step_id") REFERENCES "document_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcases" ADD CONSTRAINT "showcases_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcases" ADD CONSTRAINT "showcases_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_properties" ADD CONSTRAINT "showcase_properties_showcase_id_fkey" FOREIGN KEY ("showcase_id") REFERENCES "showcases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_properties" ADD CONSTRAINT "showcase_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
