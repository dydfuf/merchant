"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { toKoreanErrorMessage } from "../i18n/error-message";
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
        <span>사용자 ID</span>
        <input
          autoComplete="username"
          value={userId}
          onChange={(event) => {
            setUserId(event.target.value);
            setError(null);
          }}
          placeholder="아이디를 입력해 주세요"
        />
      </label>

      <label className={styles.field}>
        <span>암호</span>
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
        인증 모드: {mockAuthEnabled ? "로컬 모의 인증" : "패스스루 프리뷰"}
      </p>

      {error ? <p className={styles.error}>{toKoreanErrorMessage(error)}</p> : null}

      <button className={styles.submit} type="submit">
        길드 금고 열기
      </button>
      <button
        className={styles.secondary}
        type="button"
        onClick={() => {
          router.push("/auth/denied");
        }}
      >
        접근 거부 시뮬레이션
      </button>
    </form>
  );
}
