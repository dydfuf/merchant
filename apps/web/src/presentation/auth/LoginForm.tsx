"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./LoginForm.module.css";

interface LoginFormProps {
  mockAuthEnabled: boolean;
}

export function LoginForm({ mockAuthEnabled }: LoginFormProps) {
  const router = useRouter();
  const [userId, setUserId] = useState("player-1");
  const [password, setPassword] = useState("merchant");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUser = userId.trim();
    if (!normalizedUser || !password.trim()) {
      setError("MISSING_CREDENTIALS");
      return;
    }

    if (mockAuthEnabled && normalizedUser.toLowerCase().includes("denied")) {
      router.push("/auth/denied");
      return;
    }

    router.push(`/lobby?userId=${encodeURIComponent(normalizedUser)}`);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>User ID</span>
        <input
          autoComplete="username"
          value={userId}
          onChange={(event) => {
            setUserId(event.target.value);
            setError(null);
          }}
          placeholder="Enter your ID"
        />
      </label>

      <label className={styles.field}>
        <span>Passphrase</span>
        <input
          autoComplete="current-password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
          placeholder="••••••••"
        />
      </label>

      <p className={styles.mode}>
        Auth mode: {mockAuthEnabled ? "local-mock" : "passthrough-preview"}
      </p>

      {error ? <p className={styles.error}>{error}</p> : null}

      <button className={styles.submit} type="submit">
        Unlock Guild Vault
      </button>
      <button
        className={styles.secondary}
        type="button"
        onClick={() => {
          router.push("/auth/denied");
        }}
      >
        Simulate Access Denied
      </button>
    </form>
  );
}
