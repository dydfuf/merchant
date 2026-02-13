import Link from "next/link";

import styles from "./VictorySummary.module.css";

interface VictorySummaryProps {
  gameId: string;
  userId: string;
}

function toHandle(userId: string): string {
  return userId.startsWith("@") ? userId : `@${userId}`;
}

function toInitials(userId: string): string {
  const normalized = userId.replace(/^@/, "").trim();
  if (!normalized) {
    return "MM";
  }

  return normalized.slice(0, 2).toUpperCase();
}

function toMatchLabel(gameId: string): string {
  const compact = gameId.replace(/[^a-zA-Z0-9]/g, "");
  if (compact.length <= 4) {
    return compact.toUpperCase();
  }

  return compact.slice(-4).toUpperCase();
}

export function VictorySummary({ gameId, userId }: VictorySummaryProps) {
  const handle = toHandle(userId);
  const matchLabel = toMatchLabel(gameId);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link className={styles.iconLink} href={`/games/${encodeURIComponent(gameId)}?userId=${encodeURIComponent(userId)}`}>
            ×
          </Link>
          <span>매치 #{matchLabel}</span>
        </div>
        <button className={styles.iconButton} type="button">
          ↗
        </button>
      </header>

      <main className={styles.main}>
        <section className={styles.heroSection}>
          <h1>승리</h1>

          <article className={styles.winnerCard}>
            <div className={styles.winnerAvatar}>{toInitials(userId)}</div>
            <p className={styles.winnerHandle}>{handle}</p>
            <p className={styles.winnerTitle}>최고 상인</p>

            <div className={styles.winnerScoreRow}>
              <strong>16</strong>
              <span>
                명성
                <br />
                점수
              </span>
            </div>

            <div className={styles.turnBadge}>24턴</div>
          </article>
        </section>

        <section className={styles.velocitySection}>
          <div className={styles.sectionHeader}>
            <h2>획득 속도</h2>
            <div className={styles.legend}>
              <span>
                <i data-color="you" /> 나
              </span>
              <span>
                <i data-color="rival" /> 상대
              </span>
            </div>
          </div>

          <div className={styles.graphCard}>
            <svg viewBox="0 0 100 54" preserveAspectRatio="none" aria-hidden="true">
              <polyline
                fill="none"
                points="0,50 10,46 20,44 30,38 40,34 50,30 60,30 70,20 80,14 90,8 100,5"
                className={styles.youLine}
              />
              <polyline
                fill="none"
                points="0,50 10,50 20,49 30,46 40,42 50,38 60,35 70,35 80,30 90,26 100,24"
                className={styles.rivalLine}
              />
            </svg>
            <div className={styles.graphAxis}>
              <span>1턴</span>
              <span>12턴</span>
              <span>24턴</span>
            </div>
          </div>
        </section>

        <section className={styles.leaderboardSection}>
          <div className={styles.boardHeader}>
            <span>#</span>
            <span>상인</span>
            <span>개발</span>
            <span>점수</span>
          </div>

          <div className={styles.boardRow} data-you="true">
            <span>1</span>
            <span>
              <b>{handle}</b>
              <em>나</em>
            </span>
            <span>14</span>
            <span>16</span>
          </div>

          <div className={styles.boardRow}>
            <span>2</span>
            <span>
              <b>@MeepleMaster</b>
            </span>
            <span>11</span>
            <span>14</span>
          </div>

          <div className={styles.boardRow}>
            <span>3</span>
            <span>
              <b>@BoardGamer99</b>
            </span>
            <span>9</span>
            <span>11</span>
          </div>
        </section>

        <section className={styles.statsGrid}>
          <article>
            <span>총 보석</span>
            <strong>32</strong>
          </article>
          <article>
            <span>효율</span>
            <strong>0.66</strong>
          </article>
        </section>

        <div className={styles.spacer} />
      </main>

      <footer className={styles.footer}>
        <Link className={styles.footerSecondary} href={`/lobby?userId=${encodeURIComponent(userId)}`}>
          로비로 돌아가기
        </Link>
        <Link
          className={styles.footerPrimary}
          href={`/games/${encodeURIComponent(gameId)}?userId=${encodeURIComponent(userId)}`}
        >
          다시 대전
        </Link>
      </footer>
    </div>
  );
}
