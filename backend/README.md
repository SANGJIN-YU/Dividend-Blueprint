# Backend 개발 실행 가이드

아래 순서로 개발용 데이터베이스를 준비하고 API를 확인합니다.

## 1) DB 생성 (SQLAlchemy metadata create)

`init_db()`가 `Base.metadata.create_all()`을 호출해 테이블을 생성합니다.

```bash
cd backend
PYTHONPATH=. python -c "from app.database.base import init_db; init_db()"
```

## 2) 시더 실행 (기본 ETF 4종 upsert)

`ticker`를 기준으로 upsert 정책을 적용하며, 같은 스크립트를 여러 번 실행해도 중복 행이 생기지 않습니다.

```bash
cd backend
PYTHONPATH=. python scripts/seed_etfs.py
```

기본 입력 데이터:
- SCHD
- VOO
- VYM
- JEPI

## 3) API 확인

예시(로컬 서버 기동 후):

```bash
curl http://localhost:8000/api/v1/etfs
```

> 실제 엔드포인트는 프로젝트 라우팅 구성에 맞게 조정하세요.
