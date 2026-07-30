const express = require('express');
const kakao = require('../kakaoClient');
const store = require('../store');
const demoData = require('../demoData');
const searchCache = require('../searchCache');

const router = express.Router();

async function enrich(facility) {
  const [info, reviewSummary] = await Promise.all([
    store.getFacilityInfo(facility.id),
    store.getReviewSummary(facility.id),
  ]);
  return { ...facility, info, reviewSummary };
}

router.get('/search', async (req, res, next) => {
  try {
    const { query = '헬스장', lat, lng, radius, sort } = req.query;

    if (!kakao.isConfigured()) {
      const results = await Promise.all(demoData.search({ query, lat, lng }).map(enrich));
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

    const results = await Promise.all(kakaoRes.documents.map((doc) => enrich(kakao.normalizeDocument(doc))));
    searchCache.putAll(results);

    res.json({ demoMode: false, count: results.length, meta: kakaoRes.meta, facilities: results });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const cached = searchCache.get(id) || (!kakao.isConfigured() ? demoData.findById(id) : null);

    if (!cached) {
      return res
        .status(404)
        .json({ error: '시설 정보를 찾을 수 없습니다. 먼저 검색을 통해 시설을 조회해주세요.' });
    }

    res.json(await enrich(cached));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/info', async (req, res, next) => {
  try {
    res.json(await store.getFacilityInfo(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id/info', async (req, res, next) => {
  try {
    if (!store.isWritable()) {
      return res.status(503).json({
        error:
          'Vercel 배포에서는 Upstash Redis 연동이 필요합니다. UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 환경변수를 설정한 뒤 재배포해주세요.',
      });
    }

    const { dailyPassPrice, closedDays, notes } = req.body || {};

    if (dailyPassPrice !== undefined && dailyPassPrice !== null) {
      const price = Number(dailyPassPrice);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ error: 'dailyPassPrice는 0 이상의 숫자여야 합니다.' });
      }
    }

    const updated = await store.upsertFacilityInfo(req.params.id, { dailyPassPrice, closedDays, notes });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/reviews', async (req, res, next) => {
  try {
    const [summary, reviews] = await Promise.all([
      store.getReviewSummary(req.params.id),
      store.getReviews(req.params.id),
    ]);
    res.json({ summary, reviews });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reviews', async (req, res, next) => {
  try {
    if (!store.isWritable()) {
      return res.status(503).json({
        error:
          'Vercel 배포에서는 Upstash Redis 연동이 필요합니다. UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 환경변수를 설정한 뒤 재배포해주세요.',
      });
    }

    const { author, rating, comment } = req.body || {};
    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'rating은 1~5 사이의 정수여야 합니다.' });
    }

    const review = await store.addReview(req.params.id, { author, rating: numericRating, comment });
    const summary = await store.getReviewSummary(req.params.id);
    res.status(201).json({ review, summary });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
