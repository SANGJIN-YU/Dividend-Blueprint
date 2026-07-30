// UPSTASH_REDIS_REST_URL이 있으면 Redis(Vercel 등 서버리스용),
// 없으면 기존 파일 저장소(로컬 개발 / 파일시스템이 있는 호스트용)를 사용한다.
const backend = process.env.UPSTASH_REDIS_REST_URL ? require('./store.redis') : require('./store.file');

// Vercel(서버리스, 파일시스템 쓰기 불가)에서 Redis 없이 쓰기를 시도하면
// 조용히 실패하는 대신 라우트에서 명확한 에러를 내려주기 위한 판별 함수.
function isWritable() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL) || !process.env.VERCEL;
}

module.exports = { ...backend, isWritable };
