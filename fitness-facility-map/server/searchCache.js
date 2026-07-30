// 카카오 로컬 API는 "id로 단건 조회"를 제공하지 않으므로,
// 검색 결과를 잠깐 메모리에 캐시해두고 상세 조회(GET /:id)에서 재사용한다.
const MAX_ENTRIES = 1000;
const cache = new Map();

function put(facility) {
  cache.set(facility.id, facility);
  if (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

function putAll(facilities) {
  facilities.forEach(put);
}

function get(id) {
  return cache.get(id) || null;
}

module.exports = { put, putAll, get };
