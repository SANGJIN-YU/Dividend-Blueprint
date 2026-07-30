const DEFAULT_CENTER = { lat: 37.5663, lng: 126.9779 }; // 서울시청

const state = {
  map: null,
  markers: [],
  facilities: [],
  activeId: null,
  center: DEFAULT_CENTER,
  demoMode: true,
};

const el = {
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  locateBtn: document.getElementById('locate-btn'),
  demoBanner: document.getElementById('demo-banner'),
  list: document.getElementById('facility-list'),
  map: document.getElementById('map'),
  detailPanel: document.getElementById('detail-panel'),
  detailContent: document.getElementById('detail-content'),
  detailClose: document.getElementById('detail-close'),
};

function starString(rating) {
  const rounded = Math.round(rating || 0);
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
}

function formatPrice(price) {
  if (price === null || price === undefined) return '정보 없음';
  return `${Number(price).toLocaleString('ko-KR')}원`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `요청 실패 (${res.status})`);
  return body;
}

// ---------- Kakao Map ----------

async function initMap() {
  const config = await fetchJSON('/api/config');
  state.demoMode = config.demoMode;
  el.demoBanner.hidden = !config.demoMode;

  if (!config.kakaoJsKey) {
    el.map.innerHTML =
      '<div class="map-fallback">카카오 지도 API 키(KAKAO_JS_KEY)가 설정되지 않아\n지도 없이 목록 모드로 표시합니다.</div>';
    return runSearch();
  }

  await loadKakaoSdk(config.kakaoJsKey);

  kakao.maps.load(() => {
    state.map = new kakao.maps.Map(el.map, {
      center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
      level: 5,
    });
    runSearch();
  });
}

function loadKakaoSdk(appkey) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false&libraries=services`;
    script.onload = resolve;
    script.onerror = () => reject(new Error('카카오 지도 SDK 로드 실패'));
    document.head.appendChild(script);
  });
}

function clearMarkers() {
  state.markers.forEach((m) => m.setMap(null));
  state.markers = [];
}

function renderMarkers(facilities) {
  if (!state.map) return;
  clearMarkers();

  facilities.forEach((facility) => {
    const marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(facility.lat, facility.lng),
      map: state.map,
    });
    kakao.maps.event.addListener(marker, 'click', () => selectFacility(facility.id));
    state.markers.push(marker);
  });

  if (facilities.length > 0) {
    const bounds = new kakao.maps.LatLngBounds();
    facilities.forEach((f) => bounds.extend(new kakao.maps.LatLng(f.lat, f.lng)));
    state.map.setBounds(bounds);
  }
}

// ---------- Search & List ----------

async function runSearch() {
  const query = el.searchInput.value.trim() || '헬스장';
  el.list.innerHTML = '<li class="loading-state">검색 중...</li>';

  try {
    const params = new URLSearchParams({
      query,
      lat: state.center.lat,
      lng: state.center.lng,
      radius: 5000,
    });
    const { facilities } = await fetchJSON(`/api/facilities/search?${params.toString()}`);
    state.facilities = facilities;
    renderList(facilities);
    renderMarkers(facilities);
  } catch (err) {
    el.list.innerHTML = `<li class="empty-state">검색 중 오류: ${err.message}</li>`;
  }
}

function renderList(facilities) {
  if (facilities.length === 0) {
    el.list.innerHTML = '<li class="empty-state">검색 결과가 없습니다.</li>';
    return;
  }

  el.list.innerHTML = '';
  facilities.forEach((facility) => {
    const li = document.createElement('li');
    li.className = 'facility-card';
    li.dataset.id = facility.id;

    const priceBadge = facility.info.dailyPassPrice
      ? `<span class="badge price">💳 ${formatPrice(facility.info.dailyPassPrice)}</span>`
      : '';
    const closedBadge = facility.info.closedDays
      ? `<span class="badge closed">🚫 ${facility.info.closedDays}</span>`
      : '';
    const ratingBadge =
      facility.reviewSummary.count > 0
        ? `<span class="badge rating">⭐ ${facility.reviewSummary.average} (${facility.reviewSummary.count})</span>`
        : '<span class="badge">리뷰 없음</span>';

    li.innerHTML = `
      <div class="name">${facility.name}</div>
      <div class="category">${facility.category}</div>
      <div class="meta-row">${priceBadge}${closedBadge}${ratingBadge}</div>
    `;
    li.addEventListener('click', () => selectFacility(facility.id));
    el.list.appendChild(li);
  });
}

// ---------- Detail Panel ----------

async function selectFacility(id) {
  state.activeId = id;
  document.querySelectorAll('.facility-card').forEach((c) => c.classList.toggle('active', c.dataset.id === id));

  const facility = state.facilities.find((f) => f.id === id);
  if (!facility) return;

  if (state.map) {
    state.map.panTo(new kakao.maps.LatLng(facility.lat, facility.lng));
  }

  el.detailPanel.hidden = false;
  el.detailContent.innerHTML = '<div class="loading-state">불러오는 중...</div>';

  try {
    const { summary, reviews } = await fetchJSON(`/api/facilities/${id}/reviews`);
    renderDetail(facility, summary, reviews);
  } catch (err) {
    el.detailContent.innerHTML = `<div class="empty-state">불러오기 실패: ${err.message}</div>`;
  }
}

function renderDetail(facility, summary, reviews) {
  const info = facility.info;

  el.detailContent.innerHTML = `
    <h2>${facility.name}</h2>
    <div class="category">${facility.category}</div>

    <dl class="info-grid">
      <dt>주소</dt><dd>${facility.address}</dd>
      <dt>전화</dt><dd>${facility.phone || '정보 없음'}</dd>
      <dt>일일권</dt><dd>${formatPrice(info.dailyPassPrice)}</dd>
      <dt>휴무일</dt><dd>${info.closedDays || '정보 없음'}</dd>
      <dt>비고</dt><dd>${info.notes || '-'}</dd>
    </dl>
    ${facility.placeUrl ? `<a class="place-link" href="${facility.placeUrl}" target="_blank" rel="noopener">카카오맵에서 보기 ↗</a>` : ''}

    <div class="section-title">리뷰 (${summary.count})</div>
    <div class="review-summary">
      <span class="avg">${summary.average ?? '-'}</span>
      <span class="stars">${starString(summary.average)}</span>
    </div>
    <div id="review-list">
      ${
        reviews.length === 0
          ? '<div class="empty-state">아직 리뷰가 없습니다. 첫 리뷰를 남겨보세요!</div>'
          : reviews
              .map(
                (r) => `
        <div class="review-item">
          <div class="review-head">
            <span class="author">${r.author}</span>
            <span class="date">${formatDate(r.createdAt)}</span>
          </div>
          <div class="stars">${starString(r.rating)}</div>
          <div class="comment">${r.comment}</div>
        </div>`
              )
              .join('')
      }
    </div>
  `;
}

// ---------- Events ----------

el.searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  runSearch();
});

el.locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('이 브라우저는 위치 정보를 지원하지 않습니다.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (state.map) state.map.setCenter(new kakao.maps.LatLng(state.center.lat, state.center.lng));
      runSearch();
    },
    () => alert('위치 정보를 가져올 수 없습니다.')
  );
});

el.detailClose.addEventListener('click', () => {
  el.detailPanel.hidden = true;
  state.activeId = null;
  document.querySelectorAll('.facility-card').forEach((c) => c.classList.remove('active'));
});

initMap();
