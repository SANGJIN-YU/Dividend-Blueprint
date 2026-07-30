const app = require('./app');
const kakao = require('./kakaoClient');
const store = require('./store');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  const apiMode = kakao.isConfigured() ? '카카오 로컬 API 연동' : '데모 데이터 모드 (KAKAO_REST_API_KEY 미설정)';
  const storageMode = process.env.UPSTASH_REDIS_REST_URL ? 'Upstash Redis' : '파일(data/store.json)';
  console.log(`운동시설 지도 서버 실행 중: http://localhost:${PORT} [${apiMode} / 저장소: ${storageMode}]`);
  if (!store.isWritable()) {
    console.warn('경고: VERCEL 환경인데 Upstash Redis가 설정되지 않아 리뷰/이용권 정보 저장이 실패합니다.');
  }
});
