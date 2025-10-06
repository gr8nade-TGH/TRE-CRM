-- AlterTable
ALTER TABLE "showcases" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "landing_url" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'sent';

-- CreateTable
CREATE TABLE "showcase_interactions" (
    "id" TEXT NOT NULL,
    "showcase_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "property_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_interests" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "interest_type" TEXT NOT NULL DEFAULT 'showcase',
    "status" TEXT NOT NULL DEFAULT 'interested',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_interests_lead_id_property_id_key" ON "lead_interests"("lead_id", "property_id");

-- AddForeignKey
ALTER TABLE "showcase_interactions" ADD CONSTRAINT "showcase_interactions_showcase_id_fkey" FOREIGN KEY ("showcase_id") REFERENCES "showcases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_interests" ADD CONSTRAINT "lead_interests_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_interests" ADD CONSTRAINT "lead_interests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_interests" ADD CONSTRAINT "lead_interests_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
