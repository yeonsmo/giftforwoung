import Link from "next/link";

const FEATURES = [
  {
    title: "법령 위반 분석",
    body: "사진 또는 영상을 업로드하면 Vision LLM이 수집된 법령 DB와 대조하여 위반 여부, 근거 조항, 신뢰도를 판별합니다.",
  },
  {
    title: "다중 모델 교차 검증",
    body: "AI 키가 2개 이상 입력되면 Cross-Examination 방식의 토론 오케스트레이션으로 자동 확장됩니다.",
  },
  {
    title: "법령 준수 콘텐츠 생성",
    body: "법령 DB를 참고하여 이미지, 카피라이팅, 영상을 생성하고 다시 분석 엔진으로 재검증하는 순환 워크플로우를 제공합니다.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          보험광고 법령 위반 검증 시스템
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
          보험광고 콘텐츠의 법령 위반 여부를 검증하고, 법령 준수를 기초로 콘텐츠를
          생성하는 폐쇄형 웹 애플리케이션입니다. 인증된 사용자만 기능에 접근할 수
          있습니다.
        </p>
        <div>
          <Link
            href="/login"
            className="inline-block rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            로그인하여 시작
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <h2 className="text-sm font-semibold">{feature.title}</h2>
            <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">
              {feature.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
