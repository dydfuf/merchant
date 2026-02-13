import type { ReactNode } from "react";

import styles from "./AppShell.module.css";

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>Modern Merchant</p>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
