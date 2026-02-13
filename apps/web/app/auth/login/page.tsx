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
          <p>길드 접근 인증</p>
          <h1>머천트 로그인</h1>
          <span>장부 신원을 확인해 주세요</span>
        </div>

        <LoginForm mockAuthEnabled={mockAuthEnabled} />

        <div className={styles.footerLinks}>
          <Link href="/">랜딩으로 돌아가기</Link>
          <Link href="/auth/denied">접근 거부 화면 보기</Link>
        </div>
      </main>
    </div>
  );
}
