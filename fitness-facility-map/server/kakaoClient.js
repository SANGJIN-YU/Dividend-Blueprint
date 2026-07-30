const KAKAO_KEYWORD_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';

class KakaoApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'KakaoApiError';
    this.status = status;
  }
}

function isConfigured() {
  return Boolean(process.env.KAKAO_REST_API_KEY);
}

// Kakao Local "키워드로 장소 검색" API
// https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword
async function searchByKeyword({ query, x, y, radius, page = 1, size = 15, sort }) {
  if (!isConfigured()) {
    throw new KakaoApiError('KAKAO_REST_API_KEY가 설정되지 않았습니다.', 500);
  }

  const params = new URLSearchParams({ query, page: String(page), size: String(size) });
  if (x && y) {
    params.set('x', x);
    params.set('y', y);
  }
  if (radius) params.set('radius', String(radius));
  if (sort) params.set('sort', sort);

  const response = await fetch(`${KAKAO_KEYWORD_SEARCH_URL}?${params.toString()}`, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new KakaoApiError(`카카오 로컬 API 호출 실패 (${response.status}): ${body}`, response.status);
  }

  return response.json();
}

function normalizeDocument(doc) {
  return {
    id: doc.id,
    name: doc.place_name,
    category: doc.category_name,
    phone: doc.phone || null,
    address: doc.road_address_name || doc.address_name,
    lat: Number(doc.y),
    lng: Number(doc.x),
    placeUrl: doc.place_url,
    distanceMeters: doc.distance ? Number(doc.distance) : null,
    source: 'kakao',
  };
}

module.exports = { searchByKeyword, normalizeDocument, isConfigured, KakaoApiError };
