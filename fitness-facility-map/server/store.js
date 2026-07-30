const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'store.json');

function emptyState() {
  return { facilityInfo: {}, reviews: {} };
}

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    return emptyState();
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { facilityInfo: parsed.facilityInfo || {}, reviews: parsed.reviews || {} };
  } catch (err) {
    console.error('store.json 파싱 실패, 빈 상태로 시작합니다:', err.message);
    return emptyState();
  }
}

let state = load();

function persist() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function getFacilityInfo(facilityId) {
  return (
    state.facilityInfo[facilityId] || {
      dailyPassPrice: null,
      closedDays: null,
      notes: null,
      updatedAt: null,
    }
  );
}

function upsertFacilityInfo(facilityId, { dailyPassPrice, closedDays, notes }) {
  const existing = state.facilityInfo[facilityId] || {};
  const next = {
    dailyPassPrice: dailyPassPrice === undefined ? existing.dailyPassPrice ?? null : dailyPassPrice,
    closedDays: closedDays === undefined ? existing.closedDays ?? null : closedDays,
    notes: notes === undefined ? existing.notes ?? null : notes,
    updatedAt: new Date().toISOString(),
  };
  state.facilityInfo[facilityId] = next;
  persist();
  return next;
}

function getReviews(facilityId) {
  return state.reviews[facilityId] || [];
}

function addReview(facilityId, { author, rating, comment }) {
  const review = {
    id: crypto.randomUUID(),
    author: author && author.trim() ? author.trim().slice(0, 40) : '익명',
    rating,
    comment: comment ? comment.trim().slice(0, 1000) : '',
    createdAt: new Date().toISOString(),
  };
  if (!state.reviews[facilityId]) state.reviews[facilityId] = [];
  state.reviews[facilityId].unshift(review);
  persist();
  return review;
}

function getReviewSummary(facilityId) {
  const reviews = getReviews(facilityId);
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
