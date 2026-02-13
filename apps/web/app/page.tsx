import Link from "next/link";

import styles from "./page.module.css";

const FEATURES = [
  {
    title: "정교한 카드 경제 설계",
    description: "마켓 티어별 카드를 읽고, 예약 타이밍으로 흐름을 전환하세요.",
  },
  {
    title: "실시간 상대 흐름 분석",
    description: "상대 템포를 추적하고 우선권 타이밍을 선점하세요.",
  },
  {
    title: "길드 명성 레이스",
    description: "귀족을 확보하고 누구보다 먼저 명성 15점을 달성하세요.",
  },
];

const PREVIEW_CARDS = [
  { id: "주문서 // 루비 파동", tier: "티어 I", accent: "ruby" },
  { id: "자산 // 사파이어 항구", tier: "티어 II", accent: "sapphire" },
  { id: "귀족 // 에메랄드 궁정", tier: "티어 III", accent: "emerald" },
  { id: "금고 // 오닉스 장부", tier: "티어 II", accent: "onyx" },
];

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brandChip}>
          <span className={styles.brandMark}>◆</span>
          <span>모던 머천트</span>
        </div>
        <Link className={styles.headerAction} href="/dev/local-runtime">
          런타임 콘솔
        </Link>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroImageLayer} aria-hidden="true" />
          <div className={styles.heroContent}>
            <p className={styles.heroKicker}>실시간 전략 카드보드 전장</p>
            <h1>
              거래로 판을 열고
              <br />
              <span>권력을 거머쥐세요</span>
            </h1>
            <p>
              길드 경제를 설계하고, 상대의 동선을 차단하며, 정밀한 카드 타이밍으로
              승부를 마무리하세요.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryCta} href="/auth/login">
                지금 시작하기
              </Link>
              <Link className={styles.secondaryCta} href="/lobby?userId=player-1">
                로비 보기
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          {FEATURES.map((feature) => (
            <article key={feature.title} className={styles.featureCard}>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>

        <section className={styles.previewGrid}>
          {PREVIEW_CARDS.map((card) => (
            <article key={card.id} className={styles.previewCard} data-accent={card.accent}>
              <p className={styles.previewTier}>{card.tier}</p>
              <strong>{card.id}</strong>
              <span className={styles.previewMeta}>마켓 미리보기</span>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
