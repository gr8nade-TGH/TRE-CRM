-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'OFFBOARDED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "access_revoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offboarded_at" TIMESTAMP(3),
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_by" TEXT,
ADD COLUMN     "suspension_reason" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_suspended_by_fkey" FOREIGN KEY ("suspended_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
