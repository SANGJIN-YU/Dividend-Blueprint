const express = require('express');
const kakao = require('../kakaoClient');
const store = require('../store');
const demoData = require('../demoData');
const searchCache = require('../searchCache');

const router = express.Router();

function enrich(facility) {
  return {
    ...facility,
    info: store.getFacilityInfo(facility.id),
    reviewSummary: store.getReviewSummary(facility.id),
  };
}

router.get('/search', async (req, res, next) => {
  try {
    const { query = '헬스장', lat, lng, radius, sort } = req.query;

    if (!kakao.isConfigured()) {
      const results = demoData.search({ query, lat, lng }).map(enrich);
      searchCache.putAll(results);
      return res.json({ demoMode: true, count: results.length, facilities: results });
    }

    const kakaoRes = await kakao.searchByKeyword({
      query,
      x: lng,
      y: lat,
      radius,
      sort: sort || (lat && lng ? 'distance' : undefined),
    });

    const results = kakaoRes.documents.map((doc) => enrich(kakao.normalizeDocument(doc)));
    searchCache.putAll(results);

    res.json({ demoMode: false, count: results.length, meta: kakaoRes.meta, facilities: results });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const cached = searchCache.get(id) || (!kakao.isConfigured() ? demoData.findById(id) : null);

  if (!cached) {
    return res
      .status(404)
      .json({ error: '시설 정보를 찾을 수 없습니다. 먼저 검색을 통해 시설을 조회해주세요.' });
  }

  res.json(enrich(cached));
});

router.get('/:id/info', (req, res) => {
  res.json(store.getFacilityInfo(req.params.id));
});

router.put('/:id/info', (req, res) => {
  const { dailyPassPrice, closedDays, notes } = req.body || {};

  if (dailyPassPrice !== undefined && dailyPassPrice !== null) {
    const price = Number(dailyPassPrice);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: 'dailyPassPrice는 0 이상의 숫자여야 합니다.' });
    }
  }

  const updated = store.upsertFacilityInfo(req.params.id, { dailyPassPrice, closedDays, notes });
  res.json(updated);
});

router.get('/:id/reviews', (req, res) => {
  res.json({
    summary: store.getReviewSummary(req.params.id),
    reviews: store.getReviews(req.params.id),
  });
});

router.post('/:id/reviews', (req, res) => {
  const { author, rating, comment } = req.body || {};
  const numericRating = Number(rating);

  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ error: 'rating은 1~5 사이의 정수여야 합니다.' });
  }

  const review = store.addReview(req.params.id, { author, rating: numericRating, comment });
  res.status(201).json({ review, summary: store.getReviewSummary(req.params.id) });
});

module.exports = router;
