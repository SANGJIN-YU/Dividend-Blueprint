require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const facilitiesRouter = require('./routes/facilities');
const configRouter = require('./routes/config');
const kakao = require('./kakaoClient');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/config', configRouter);
app.use('/api/facilities', facilitiesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err instanceof kakao.KakaoApiError ? err.status : 500;
  res.status(status).json({ error: err.message || '서버 오류가 발생했습니다.' });
});

module.exports = app;
