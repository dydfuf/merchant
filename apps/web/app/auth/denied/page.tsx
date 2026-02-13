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
          <h1>접근이 거부되었습니다</h1>
          <p>인증 거래가 차단되었습니다</p>
        </div>

        <div className={styles.messageBox}>
          <p>머천트 길드에서 디지털 서명을 확인하지 못했습니다.</p>
          <span>오류 코드: 403_CREDENTIAL_MISMATCH</span>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primary} href="/auth/login">
            다시 인증하기
          </Link>
          <Link className={styles.secondary} href="/">
            랜딩으로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
