# 카드뉴스 파이프라인 (MVP)

기업 재무지표 서사화 카드뉴스 자동 생성 파이프라인. `요건정의서`(Phase 1~5)에 정의된
데이터 수집 → 지표 가공 → 서사 생성 → 이미지 렌더링 흐름을 구현한다. **발행은 사람 검수 후 수동으로 진행한다.**

## 아키텍처

```
뉴스 언급량 API + 주가 등락률 API ──▶ 화제 기업 선정 (topicSelector)
                                          │
                                          ▼
                              DART Open API (dartClient)
                                          │
                                          ▼
                         지표 가공 (financialMetrics: 분기 환산 / YoY / QoQ / 부채비율)
                                          │
                                          ▼
                        Claude API 서사 생성 (narrativeGenerator, 가드레일 프롬프트)
                                          │
                                          ▼
                          차트 이미지 생성 (chartGenerator: QuickChart / 인라인 SVG)
                                          │
                                          ▼
                   HTML 템플릿 치환 + Puppeteer 렌더링 (templateRenderer / imageRenderer)
                                          │
                                          ▼
                     output/{종목코드}_{날짜}/ 에 PNG + 원본 데이터 JSON 저장 (검수용)
```

## 빠른 시작

```bash
cd card-news-pipeline
npm install
cp .env.example .env   # API 키 입력

# 실제 API로 전체 파이프라인 실행 (오늘의 화제 기업 1~3건)
npm start

# API 키 없이 샘플 데이터로 전체 파이프라인 동작 확인 (오프라인)
npm run demo

# 유닛/통합 테스트 (mock 모드)
npm test
```

실행 결과는 `output/{종목코드}_{YYYYMMDD}/` 폴더에 `{종목코드}_{YYYYMMDD}.png` (카드뉴스 이미지)와
`{종목코드}_{YYYYMMDD}.json` (원본 데이터 + 생성된 서사문)이 나란히 저장된다. 이 폴더를 열어
사람이 사실 오류를 검수한 뒤 SNS에 수동으로 발행한다 (FR-07).

## 환경변수 (.env)

`.env.example` 참고. 주요 항목:

| 변수 | 설명 |
|---|---|
| `DART_API_KEY` | DART Open API 키 (https://opendart.fss.or.kr) |
| `ANTHROPIC_API_KEY` | 서사 문장 생성용 Claude API 키 |
| `NEWS_API_PROVIDER` | 뉴스 언급량 조회 방식. 기본 `mock`. 실제 서비스 연동 시 `generic` + `NEWS_API_URL`/`NEWS_API_KEY` 설정 |
| `STOCK_API_PROVIDER` | 주가 등락률 조회 방식. 기본 `mock`. 실제 연동 시 `generic` + `STOCK_API_URL`/`STOCK_API_KEY` 설정 |
| `TOPIC_COMPANY_COUNT` | 하루에 생성할 화제 기업 수 (기본 3) |
| `MIN_ABS_PRICE_CHANGE_RATE` | 화제 기업 필터: 주가 등락률 최소 절댓값(%) (기본 1.5) |
| `MOCK_MODE` | `true`이면 모든 외부 API 대신 `data/fixtures/*` 샘플 데이터를 사용 |

## 사전 준비: DART corp_code 매핑

DART API는 종목코드(6자리)가 아닌 자체 `corp_code`로 회사를 조회한다.

```bash
npm run update-corp-codes
```

DART의 `corpCode.xml` 전체를 내려받아 상장사만 필터링한 `data/corpCodes.json`을 생성한다
(최초 1회 및 신규 상장사 반영 시 재실행). 이 파일이 없으면 `data/fixtures/corpCodes.sample.json`
(테스트용 가짜 데이터)로 대체 동작한다.

## 뉴스 언급량 / 주가 등락률 연동(FR-01)

`NEWS_API_PROVIDER`, `STOCK_API_PROVIDER` 를 `generic`으로 설정하고 `NEWS_API_URL`,
`STOCK_API_URL` 을 지정하면 `src/clients/newsMentionClient.js`, `src/clients/stockPriceClient.js`
의 `mapResponse()` 를 실제 API 응답 스펙에 맞춰 조정해서 사용한다. (빅카인즈 등 서비스별 계약이
다양해 여기서는 매핑 지점만 마련해두었다.)

## 모듈 구조

```
main.js                        # 진입점: 화제 기업 선정 → 기업별 파이프라인 실행 → 결과 요약
src/pipeline.js                # 기업 1건에 대한 전체 파이프라인 orchestration
src/config.js                  # .env 로딩 및 설정값
src/logger.js                  # 실행 로그 (logs/pipeline-YYYY-MM-DD.log) - FR-08
src/clients/                   # 외부 API 클라이언트 (DART / Claude / 뉴스 / 주가)
src/services/
  corpCodeService.js           # 종목코드 -> corp_code 조회
  topicSelector.js             # FR-01 화제 기업 선정
  financialMetrics.js          # FR-03 분기 환산 + YoY/QoQ + 부채비율
  narrativeGenerator.js        # FR-04 서사 문장 생성 (가드레일 프롬프트)
  chartGenerator.js            # FR-05 차트 이미지
  templateRenderer.js          # FR-06 HTML 템플릿 치환
  imageRenderer.js             # FR-06 Puppeteer PNG 렌더링
templates/card-template.html   # 카드뉴스 템플릿 (1080x1080)
scripts/updateCorpCodes.js     # DART corp_code 매핑 갱신 스크립트
data/fixtures/                 # mock/데모/테스트용 샘플 데이터
```

## 정확성/신뢰성 관련 설계 메모

- **분기 환산**: DART는 누적(1분기/반기/3분기/사업보고서) 수치만 제공한다. 단일 분기 값은
  `당기 누적 - 직전 분기 누적` 의 정확한 차분으로 계산하며(임의 추정 아님), 이는
  `financialMetrics.js` 에 구현되어 있다.
- **YoY**: DART가 각 보고서에 함께 제공하는 `전년동기 누적(frmtrm_amount)` 값을 그대로 사용한다.
- **필수 데이터 결측 시**: 최근 분기 매출/영업이익이 없으면 해당 기업은 자동 스킵되고
  (`main.js`), 로그에 사유가 남는다. 한 기업의 실패가 전체 배치를 막지 않는다.
- **투자 권유/전망 단정 금지**: `narrativeGenerator.js` 의 시스템 프롬프트에 명시했다. 다만
  LLM 출력이므로 사람 검수 단계는 항상 필수로 유지한다 (요건정의서 6절 참고).

## 자동 실행 (GitHub Actions)

`.github/workflows/card-news-daily.yml` 이 매일 08:30 KST 에 `node main.js` 를 실행하고,
생성된 이미지/데이터를 워크플로 아티팩트로 업로드한다 (FR-09). 저장소 Settings → Secrets 에
`DART_API_KEY`, `ANTHROPIC_API_KEY` 등을 등록해야 실제 데이터로 동작한다. Chromium은
`src/util/chromium.js` 가 필요 시 자동으로 내려받아 `.chromium-cache/` 에 캐시한다.

## 이번 MVP 범위 밖 (Out of Scope)

- 사람 승인 없는 SNS 완전 자동 발행
- 다국어 지원, 모바일 앱, 실시간 장중 반영, 구독 결제
- 다중 템플릿(FR-10) — 카드뉴스 템플릿 1종만 우선 구현
