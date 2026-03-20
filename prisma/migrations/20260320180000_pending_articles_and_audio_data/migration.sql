-- AlterTable
ALTER TABLE "news" ADD COLUMN     "audioDataEn" TEXT,
ADD COLUMN     "audioDataHi" TEXT,
ADD COLUMN     "audioDataHinglish" TEXT;

-- CreateTable
CREATE TABLE "pending_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "imageUrl" TEXT,
    "pubDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_articles_sourceUrl_key" ON "pending_articles"("sourceUrl");
