import Link from "next/link";

import { assertLocalAuthGuard } from "../../../src/lib/local-auth";
import { LoginForm } from "../../../src/presentation/auth/LoginForm";

import styles from "./page.module.css";

export default function LoginPage() {
  const mockAuthEnabled = assertLocalAuthGuard();

  return (
    <div className={styles.page}>
      <div className={styles.glowLeft} aria-hidden="true" />
      <div className={styles.glowRight} aria-hidden="true" />

      <main className={styles.main}>
        <div className={styles.brandBlock}>
          <div className={styles.brandIcon}>◆</div>
          <p>Guild Access</p>
          <h1>Merchant Login Access</h1>
          <span>Authenticate your ledger identity</span>
        </div>

        <LoginForm mockAuthEnabled={mockAuthEnabled} />

        <div className={styles.footerLinks}>
          <Link href="/">Back to Landing</Link>
          <Link href="/auth/denied">View Denied State</Link>
        </div>
      </main>
    </div>
  );
}
