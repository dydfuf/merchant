import Link from "next/link";

import styles from "./page.module.css";

const FEATURES = [
  {
    title: "Deep Card Economy",
    description: "Draft from market tiers and pivot with reserve timing.",
  },
  {
    title: "Real-time Rival Reads",
    description: "Track opponent tempo and steal priority windows.",
  },
  {
    title: "Guild Prestige Race",
    description: "Secure nobles and cross 15 prestige before the table.",
  },
];

const PREVIEW_CARDS = [
  { id: "Spell // Ruby Surge", tier: "Tier I", accent: "ruby" },
  { id: "Asset // Sapphire Port", tier: "Tier II", accent: "sapphire" },
  { id: "Noble // Emerald Court", tier: "Tier III", accent: "emerald" },
  { id: "Vault // Onyx Ledger", tier: "Tier II", accent: "onyx" },
];

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brandChip}>
          <span className={styles.brandMark}>◆</span>
          <span>Modern Merchant</span>
        </div>
        <Link className={styles.headerAction} href="/dev/local-runtime">
          Runtime Console
        </Link>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroImageLayer} aria-hidden="true" />
          <div className={styles.heroContent}>
            <p className={styles.heroKicker}>Realtime Strategy Cardboard</p>
            <h1>
              Trade Your Way
              <br />
              <span>To Power</span>
            </h1>
            <p>
              Build your guild economy, deny rival lines, and close the board with surgical
              card timing.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryCta} href="/auth/login">
                Play Now
              </Link>
              <Link className={styles.secondaryCta} href="/lobby?userId=player-1">
                View Lobby
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
              <span className={styles.previewMeta}>Market Preview</span>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
