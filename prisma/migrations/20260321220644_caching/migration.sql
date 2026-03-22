-- CreateIndex
CREATE INDEX "news_isActive_createdAt_idx" ON "news"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "news_isActive_trendingScore_idx" ON "news"("isActive", "trendingScore");

-- CreateIndex
CREATE INDEX "news_isActive_viewCount_idx" ON "news"("isActive", "viewCount");

-- CreateIndex
CREATE INDEX "news_publishedAt_idx" ON "news"("publishedAt");

-- CreateIndex
CREATE INDEX "news_tags_tagId_idx" ON "news_tags"("tagId");

-- CreateIndex
CREATE INDEX "user_topic_scores_userId_idx" ON "user_topic_scores"("userId");
