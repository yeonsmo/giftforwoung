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
4. AI API 키 관리(Gemini 기본, 다중, 암호화) + 단일 모델 분석 엔진  (완료)
5. 다중 모델 토론 오케스트레이션(Cross-Examination)  (완료)
6. 생성 모델(출력 유형 선택, 키 매핑, 범용 트렌드 API)  (완료)
7. 순환 워크플로우(생성 후 재검증)  (완료)
8. 웹훅 및 외부 API 키 발행  (완료)
9. 인스타그램 자동 업로드 백엔드(완전 구현, 동결) + 프론트 동결 표시  (완료)
10. 통합 테스트 및 무료 티어 검증  (완료)

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
- `0002_system_settings.sql`: `system_settings`(최고권한자 잠금), 인덱스.
- `0003_legislation.sql`: `legislation`, `legislation_meta`(91일 카운터), `app_secrets`(암호화 비밀).
- `0004_ai_and_analyses.sql`: `ai_provider_keys`(암호화 AI 키), `analyses`(분석 기록).
- `0005_generation.sql`: `ai_provider_keys.category`(llm/image/video 분리), `generations`(생성 기록).
- `0006_api_keys.sql`: `api_keys`(외부 발행 키, 해시 저장, 웹훅 URL).
- `0007_instagram.sql`: `instagram_scheduled_posts`(동결 기능 스케줄러 백엔드).

파일 업로드는 Supabase Storage 버킷(`SUPABASE_STORAGE_BUCKET`, 기본 `uploads`)을 사용합니다. Supabase 대시보드 또는 CLI에서 해당 버킷을 생성하십시오. 영상 등 대용량 파일은 서명된 업로드 URL로 브라우저에서 직접 업로드되어 서버리스 4.5MB 제한을 우회합니다.

최고권한자 시드(자격증명 준비 후):

```bash
npm run db:seed
```

## 통합 테스트 (Step 10)

자격증명 없이 검증 가능한 정적/통합 점검:

```bash
npm install
npm run env:check
npm run typecheck
npm run lint
npm run build
# 개발 서버를 띄운 상태에서(예: PORT=4173 npm run dev) 전 라우트 보안 점검:
SMOKE_BASE_URL=http://localhost:4173 npm run test:smoke
```

`test:smoke`는 공개 페이지(200), 보호 페이지의 로그인 리다이렉트(307), 모든 API의
미인증 차단(401)을 전수 점검합니다(33개 항목). 실제 로그인/DB 조회, 법령 수집,
모델 분석·생성·재검증, 인스타 게시는 실제 자격증명이 필요하므로 자격증명 입력 후
검증합니다.

## 무료 티어 고려사항

- Supabase 무료 티어: PostgreSQL 약 500MB, Storage 약 1GB, Auth 포함. 본 앱 시작에 적합하며,
  DB 연결 정보가 환경변수로 외부화되어 추후 본인 DB로 전환 가능합니다.
- Vercel 무료(Hobby) 티어: 서버리스 함수 실행 시간 제한이 있습니다. 코드의 `maxDuration=300`은
  유료 플랜에서 적용되며, Hobby에서는 기본 제한으로 인해 대량 법령 수집/다중 모델 토론/영상
  처리 같은 장시간 작업이 타임아웃될 수 있습니다. 대용량 업로드는 Storage 직접 업로드로
  4.5MB 페이로드 제한을 우회합니다(구현됨).

## 배포 체크리스트

1. Supabase 프로젝트 생성 → `.env`(또는 Vercel 환경변수)에 URL/anon/service role 키 입력.
2. `APP_ENCRYPTION_KEY` 생성: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
3. `supabase/migrations/0001~0007`을 순서대로 적용.
4. Storage 버킷 `uploads` 생성.
5. `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` 설정 후 `npm run db:seed`.
6. 소유자 법제처 API 키 입력 → 법령 사전 수집 → 키 삭제(3-4 시나리오).
7. AI 키(Gemini 등) 입력. 필요 시 이미지/영상/트렌드 키 입력.
8. Vercel에 동일 환경변수 설정 후 배포. 인스타 자동 업로드는 동결 상태이며,
   자격증명 + `FEATURE_INSTAGRAM_ENABLED=true` + 메뉴 토글로 활성화합니다.

## 데스크톱 앱(.exe) — 풀 로컬 Electron

Electron으로 Next.js 앱을 PC에서 직접 구동하는 데스크톱 빌드입니다(Vercel 불필요).
더블클릭으로 실행되며 전용 아이콘이 포함됩니다. 인증/DB/스토리지는 기존 Supabase를
그대로 사용하므로 인터넷 연결이 필요합니다.

구성:
- `electron/main.js`: Next standalone 서버(`.next/standalone/server.js`)를 로컬 포트에서
  실행한 뒤 창으로 로드. 종료 시 서버 프로세스도 정리.
- `electron/preload.js`: contextIsolation 적용, 렌더러에 추가 권한 미노출.
- `electron-builder.yml`: Windows `nsis` 설치 파일 + `portable` exe, 아이콘 `build/icon.ico`.
- `build/icon.svg` → `build/icon.png` / `build/icon.ico` (`npm run icons`로 재생성).

### 빌드 (Windows 또는 Windows CI 권장)

```bash
# 1) 빌드용 공개값 입력 (.env.local). NEXT_PUBLIC_* 는 빌드 시 바이너리에 인라인됩니다.
#    NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dist:win   # next build + electron-builder --win → dist/ 에 .exe 생성
```

### 런타임 비밀 (서버 전용)

배포된 exe 옆 또는 사용자 데이터 폴더(`%APPDATA%/보험광고 법령 검증`)에 `.env` 파일을
두면 실행 시 로드됩니다. 예: `SUPABASE_SERVICE_ROLE_KEY`, `APP_ENCRYPTION_KEY` 등.
법제처/AI 키는 앱 설정 메뉴에서 DB에 암호화 저장되므로 `.env`에 둘 필요가 없습니다.

### 주의

- `NEXT_PUBLIC_*` 값은 빌드 시 인라인됩니다. 서버 전용 비밀은 절대 `NEXT_PUBLIC_`로 두지 마십시오.
- 로컬 실행에서는 서버 전용 비밀이 사용자 PC에 위치합니다. 단일 소유자 운영을 전제로 하며,
  다중 사용자 공유 환경에는 웹(서버) 배포를 권장합니다.
- Windows `.exe`는 Windows에서 빌드하는 것을 권장합니다(Linux/mac에서 win 타겟 빌드는 추가
  도구가 필요). 아이콘 변경은 `build/icon.svg` 수정 후 `npm run icons`.

## 보안 원칙

- 모든 비밀 키(법제처 API 키, AI API 키, DB 자격증명)는 서버 사이드 또는 암호화된
  DB 컬럼에만 저장합니다. 클라이언트에 노출하지 않습니다.
- AI API 키는 환경변수가 아니라 DB에 암호화하여 저장합니다(설정 메뉴에서 관리).
- 동결 상태 기능(인스타그램 자동 업로드)은 삭제하지 않고 비활성 상태로 둡니다.
- 출력에 이모지를 사용하지 않습니다.
