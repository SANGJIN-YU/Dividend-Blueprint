const express = require('express');
const kakao = require('../kakaoClient');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    kakaoJsKey: process.env.KAKAO_JS_KEY || null,
    demoMode: !kakao.isConfigured(),
  });
});

module.exports = router;
