-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DEVELOPER', 'QA_TESTER', 'DESIGNER', 'PRODUCT_MANAGER', 'DATA_ANALYST', 'DEVOPS_ENGINEER', 'ENGINEERING_MANAGER', 'FOUNDER');

-- CreateEnum
CREATE TYPE "BehaviorType" AS ENUM ('VIEW', 'READ_SUMMARY', 'CLICK_DETAIL', 'CLICK_FUTURE', 'CLICK_BUILD', 'READ_DETAIL', 'SHARE');

-- AlterTable
ALTER TABLE "news" ADD COLUMN     "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "quizCompletedAt" TIMESTAMP(3),
ADD COLUMN     "role" "UserRole";

-- CreateTable
CREATE TABLE "user_behaviors" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "type" "BehaviorType" NOT NULL,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_behaviors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_topic_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tagSlug" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_topic_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_behaviors_userId_createdAt_idx" ON "user_behaviors"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_behaviors_userId_newsId_type_idx" ON "user_behaviors"("userId", "newsId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "user_topic_scores_userId_tagSlug_key" ON "user_topic_scores"("userId", "tagSlug");

-- AddForeignKey
ALTER TABLE "user_behaviors" ADD CONSTRAINT "user_behaviors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_behaviors" ADD CONSTRAINT "user_behaviors_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_topic_scores" ADD CONSTRAINT "user_topic_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
