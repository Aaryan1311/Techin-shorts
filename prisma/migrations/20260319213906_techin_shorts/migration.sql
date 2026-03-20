-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT;
