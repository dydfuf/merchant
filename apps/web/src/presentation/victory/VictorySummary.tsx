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
          <span>Match #{matchLabel}</span>
        </div>
        <button className={styles.iconButton} type="button">
          ↗
        </button>
      </header>

      <main className={styles.main}>
        <section className={styles.heroSection}>
          <h1>Victory</h1>

          <article className={styles.winnerCard}>
            <div className={styles.winnerAvatar}>{toInitials(userId)}</div>
            <p className={styles.winnerHandle}>{handle}</p>
            <p className={styles.winnerTitle}>Master Merchant</p>

            <div className={styles.winnerScoreRow}>
              <strong>16</strong>
              <span>
                Prestige
                <br />
                Points
              </span>
            </div>

            <div className={styles.turnBadge}>24 Turns</div>
          </article>
        </section>

        <section className={styles.velocitySection}>
          <div className={styles.sectionHeader}>
            <h2>Acquisition Velocity</h2>
            <div className={styles.legend}>
              <span>
                <i data-color="you" /> You
              </span>
              <span>
                <i data-color="rival" /> Rival
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
              <span>T1</span>
              <span>T12</span>
              <span>T24</span>
            </div>
          </div>
        </section>

        <section className={styles.leaderboardSection}>
          <div className={styles.boardHeader}>
            <span>#</span>
            <span>Merchant</span>
            <span>Devs</span>
            <span>Pts</span>
          </div>

          <div className={styles.boardRow} data-you="true">
            <span>1</span>
            <span>
              <b>{handle}</b>
              <em>You</em>
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
            <span>Total Gems</span>
            <strong>32</strong>
          </article>
          <article>
            <span>Efficiency</span>
            <strong>0.66</strong>
          </article>
        </section>

        <div className={styles.spacer} />
      </main>

      <footer className={styles.footer}>
        <Link className={styles.footerSecondary} href={`/lobby?userId=${encodeURIComponent(userId)}`}>
          Back to Lobby
        </Link>
        <Link
          className={styles.footerPrimary}
          href={`/games/${encodeURIComponent(gameId)}?userId=${encodeURIComponent(userId)}`}
        >
          Rematch
        </Link>
      </footer>
    </div>
  );
}
