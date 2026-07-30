// Vercel 등 서버리스 환경에서는 파일시스템에 쓸 수 없으므로
// Upstash Redis(REST 기반, Vercel Marketplace 연동 시 자동으로 아래 두 env가 채워짐)에 저장한다.
const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

const infoKey = (facilityId) => `facility:info:${facilityId}`;
const reviewsKey = (facilityId) => `facility:reviews:${facilityId}`;

async function getFacilityInfo(facilityId) {
  const data = await redis.get(infoKey(facilityId));
  return (
    data || {
      dailyPassPrice: null,
      closedDays: null,
      notes: null,
      updatedAt: null,
    }
  );
}

async function upsertFacilityInfo(facilityId, { dailyPassPrice, closedDays, notes }) {
  const existing = await getFacilityInfo(facilityId);
  const next = {
    dailyPassPrice: dailyPassPrice === undefined ? existing.dailyPassPrice ?? null : dailyPassPrice,
    closedDays: closedDays === undefined ? existing.closedDays ?? null : closedDays,
    notes: notes === undefined ? existing.notes ?? null : notes,
    updatedAt: new Date().toISOString(),
  };
  await redis.set(infoKey(facilityId), next);
  return next;
}

async function getReviews(facilityId) {
  const data = await redis.get(reviewsKey(facilityId));
  return data || [];
}

async function addReview(facilityId, { author, rating, comment }) {
  const review = {
    id: crypto.randomUUID(),
    author: author && author.trim() ? author.trim().slice(0, 40) : '익명',
    rating,
    comment: comment ? comment.trim().slice(0, 1000) : '',
    createdAt: new Date().toISOString(),
  };
  const reviews = await getReviews(facilityId);
  reviews.unshift(review);
  await redis.set(reviewsKey(facilityId), reviews);
  return review;
}

async function getReviewSummary(facilityId) {
  const reviews = await getReviews(facilityId);
  if (reviews.length === 0) return { average: null, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

module.exports = {
  getFacilityInfo,
  upsertFacilityInfo,
  getReviews,
  addReview,
  getReviewSummary,
};
