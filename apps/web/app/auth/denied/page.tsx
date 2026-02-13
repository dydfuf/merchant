import Link from "next/link";

import styles from "./page.module.css";

export default function DeniedPage() {
  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.card}>
        <div className={styles.iconWrap}>
          <div className={styles.icon}>!</div>
          <div className={styles.seal}>⛨</div>
        </div>

        <div className={styles.heading}>
          <h1>Access Refused</h1>
          <p>Transaction Denied</p>
        </div>

        <div className={styles.messageBox}>
          <p>The Merchant&apos;s Guild could not verify your digital signature.</p>
          <span>Error Code: 403_CREDENTIAL_MISMATCH</span>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primary} href="/auth/login">
            Re-Authenticate
          </Link>
          <Link className={styles.secondary} href="/">
            Return to Landing
          </Link>
        </div>
      </section>
    </main>
  );
}
