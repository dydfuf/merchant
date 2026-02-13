# apps/web

`apps/web`는 Merchant의 Next.js(App Router) 클라이언트입니다.

## Route Map

- `/` : 랜딩 화면
- `/auth/login` : 로그인(로컬 mock/passthrough)
- `/auth/denied` : 인증 실패 화면
- `/lobby` : 로비 대시보드
- `/games/[gameId]` : 메인 게임 화면
- `/games/[gameId]/victory` : 승리 화면
- `/dev/local-runtime` : 기존 로컬 런타임 진단 콘솔

## Development

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속.

## Environment Variables

- `NEXT_PUBLIC_GAME_SERVER_URL` : 게임 서버 HTTP URL (기본: `http://127.0.0.1:4010`)
- `ENABLE_LOCAL_AUTH_MOCK` : 로컬 mock auth 사용 여부 (`true`일 때만 mock 모드)

`ENABLE_LOCAL_AUTH_MOCK=true`는 개발 환경에서만 허용되며, production 환경에서는 예외를 발생시켜 차단됩니다.

## Quality Commands

```bash
pnpm lint
pnpm check-types
pnpm test
```
