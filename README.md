# 보험광고 법령 위반 검증 웹앱

보험광고 콘텐츠의 법령 위반 여부를 검증하고, 법령 준수를 기초로 콘텐츠를 생성하는
폐쇄형 웹 애플리케이션입니다. Next.js(App Router) 기반이며 Vercel에 배포하고
Supabase(PostgreSQL + Auth)를 사용합니다.

## 기술 스택

- Next.js 15 (App Router), React 19, TypeScript (strict)
- Tailwind CSS 4
- Supabase (DB / Auth / Storage)
- zod 기반 환경변수 검증

## 구현 단계 (Step-by-Step)

이 프로젝트는 명세에 따라 10단계로 나누어 단계별로 구현하고, 각 단계 완료 후
검증한 뒤 다음 단계로 진행합니다.

1. Next.js + Vercel + Supabase 인프라 및 환경변수 구조  (완료)
2. 인증 + 3등급 권한 + 관리자 페이지 + 최고권한자 보호(서버 강제)  (완료)
3. 법제처 API 연동, 법령 수집(7범주), 91일 업데이트 카운터  (완료)
4. AI API 키 관리(Gemini 기본, 다중, 암호화) + 단일 모델 분석 엔진
5. 다중 모델 토론 오케스트레이션(Cross-Examination)
6. 생성 모델(출력 유형 선택, 키 매핑, 범용 트렌드 API)
7. 순환 워크플로우(생성 후 재검증)
8. 웹훅 및 외부 API 키 발행
9. 인스타그램 자동 업로드 백엔드(완전 구현, 동결) + 프론트 동결 표시
10. 통합 테스트 및 무료 티어 검증

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 `.env.local`로 복사한 뒤 값을 채웁니다. 모든 비밀 키는
서버 사이드 전용이며, `NEXT_PUBLIC_` 접두사가 붙은 값만 브라우저에 노출됩니다.

```bash
cp .env.example .env.local
```

Supabase 자격증명이 아직 없다면, 검증을 위해 스키마에 유효한 임시값을 넣어도
빌드와 개발 서버가 동작합니다. 예:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
SUPABASE_SERVICE_ROLE_KEY=placeholder
```

암호화 마스터 키 생성:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. 환경변수 점검

```bash
npm run env:check
```

### 4. 개발 서버 실행

```bash
npm run dev
```

- 랜딩 페이지: http://localhost:3000
- 헬스 체크: http://localhost:3000/api/health

## 검증 (Step 1)

```bash
npm install
npm run lint
npm run typecheck
npm run env:check
npm run build
```

## 데이터베이스

마이그레이션은 `supabase/migrations/`에 단계별로 작성됩니다. Supabase 자격증명이
준비되면 Supabase CLI(`supabase db push`) 또는 SQL 편집기로 적용합니다.

- `0001_init.sql`: `profiles` 테이블, `app_role` enum, 신규 사용자 트리거, RLS.

최고권한자 시드(자격증명 준비 후):

```bash
npm run db:seed
```

## 보안 원칙

- 모든 비밀 키(법제처 API 키, AI API 키, DB 자격증명)는 서버 사이드 또는 암호화된
  DB 컬럼에만 저장합니다. 클라이언트에 노출하지 않습니다.
- AI API 키는 환경변수가 아니라 DB에 암호화하여 저장합니다(설정 메뉴에서 관리).
- 동결 상태 기능(인스타그램 자동 업로드)은 삭제하지 않고 비활성 상태로 둡니다.
- 출력에 이모지를 사용하지 않습니다.
