# 운동시설 지도 (Fitness Facility Map)

지도에서 주변 운동시설(헬스장, 필라테스, 요가, 수영장, 크로스핏 등)을 검색하고,
**일일 이용권 가격 · 휴무일 · 리뷰**를 한 곳에서 확인할 수 있는 웹 앱입니다.

## 어떻게 데이터를 구성했나요

- **위치/기본 정보** (이름, 주소, 전화번호, 좌표): 카카오 로컬 API(키워드 장소 검색)로 실시간 조회합니다.
- **일일 이용권 가격 / 휴무일 / 리뷰**: 카카오·네이버 등의 지도 API는 이 정보를 공개 API로 제공하지 않습니다.
  이 앱은 자체 저장소(`data/store.json`)에 시설별로 이 정보를 보관하며, 사용자가 앱 화면에서 직접
  입력·수정하거나 리뷰를 남길 수 있는 크라우드소싱 구조로 되어 있습니다.
- `KAKAO_REST_API_KEY`가 없으면 `data/demoFacilities.json`의 샘플 데이터로 동작하는 **데모 모드**로 자동 전환됩니다
  (키 없이도 바로 실행해서 UI/기능을 확인할 수 있습니다).

## 실행 방법

```bash
cd fitness-facility-map
npm install
cp .env.example .env
npm start
# http://localhost:3000 접속
```

`.env`에 키를 넣지 않으면 데모 데이터로 동작합니다. 실제 카카오 지도/장소 검색을 쓰려면:

1. [카카오 개발자 콘솔](https://developers.kakao.com)에서 애플리케이션 생성
2. **앱 키 > JavaScript 키** → `.env`의 `KAKAO_JS_KEY`
3. **앱 키 > REST API 키** → `.env`의 `KAKAO_REST_API_KEY`
4. **플랫폼 > Web** 에 서비스 도메인(예: `http://localhost:3000`) 등록
5. 서버 재시작

## 주요 기능

- 키워드로 운동시설 검색 (헬스장 / 필라테스 / 요가 / 수영장 / 크로스핏 등), 내 위치 기준 거리순 정렬
- 카카오 지도에 마커 표시, 목록/마커 클릭 시 상세 패널 오픈
- 시설별 일일 이용권 가격, 휴무일, 비고 표시 및 수정
- 리뷰 작성(별점 + 코멘트) 및 평균 평점 집계

## API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/config` | 프론트엔드 초기화용 설정(JS 키, 데모모드 여부) |
| GET | `/api/facilities/search?query=&lat=&lng=&radius=` | 시설 검색 (카카오 API 또는 데모 데이터) |
| GET | `/api/facilities/:id` | 시설 상세 (직전 검색 캐시 기반) |
| GET | `/api/facilities/:id/info` | 이용권 가격/휴무일/비고 조회 |
| PUT | `/api/facilities/:id/info` | 이용권 가격/휴무일/비고 수정 |
| GET | `/api/facilities/:id/reviews` | 리뷰 목록 + 평균 평점 |
| POST | `/api/facilities/:id/reviews` | 리뷰 등록 `{ author, rating(1-5), comment }` |

## 폴더 구조

```
fitness-facility-map/
├── server/
│   ├── index.js          # Express 앱 진입점
│   ├── kakaoClient.js     # 카카오 로컬 API 호출
│   ├── store.js           # 이용권/휴무일/리뷰 JSON 저장소
│   ├── demoData.js        # 데모 모드용 샘플 데이터 로직
│   ├── searchCache.js     # 검색결과 캐시(상세조회용)
│   └── routes/
├── public/                # 프론트엔드 (vanilla JS, 빌드 불필요)
├── data/
│   ├── demoFacilities.json  # 데모 시설 목록(가상의 예시 데이터)
│   └── store.json           # 이용권가격/휴무일/리뷰 저장 파일
└── .env.example
```

## 알아두면 좋은 점 / 한계

- `data/demoFacilities.json`은 실제 상호가 아닌 예시 데이터입니다.
- `data/store.json`은 파일 기반 저장소로, 다중 서버 인스턴스나 동시 쓰기 트래픽이 큰 운영 환경에는
  적합하지 않습니다. 실서비스로 확장 시 PostgreSQL 등으로 교체를 권장합니다.
- 카카오 로컬 API는 "id로 단건 재조회"를 지원하지 않아, 상세 조회는 서버 메모리에 캐시된
  직전 검색 결과를 사용합니다. 서버 재시작 직후 검색 없이 상세 URL로 바로 접근하면 404가 반환됩니다.
