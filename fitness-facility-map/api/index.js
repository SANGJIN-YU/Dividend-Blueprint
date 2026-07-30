// Vercel 서버리스 진입점: 모든 /api/* 요청이 vercel.json의 rewrite를 통해
// 이 함수로 들어오고, Express 앱(server/app.js)이 자신의 라우터로 내부 분기한다.
module.exports = require('../server/app');
