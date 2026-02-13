const ERROR_MESSAGE_MAP: Array<{ code: string; text: string }> = [
  { code: "HTTP_401", text: "인증이 만료되었습니다. 다시 로그인해 주세요." },
  { code: "HTTP_403", text: "권한이 없습니다. 계정을 확인해 주세요." },
  { code: "MISSING_CREDENTIALS", text: "아이디와 암호를 모두 입력해 주세요." },
  { code: "GAME_ID_REQUIRED", text: "게임 ID를 입력해 주세요." },
  { code: "GAME_NOT_READY", text: "게임 상태가 아직 준비되지 않았습니다." },
  { code: "GAME_CREATE_FAILED", text: "게임 생성에 실패했습니다." },
  { code: "GAME_LOAD_FAILED", text: "게임 정보를 불러오지 못했습니다." },
  { code: "COMMAND_SEND_FAILED", text: "명령 전송에 실패했습니다." },
  { code: "COMMAND_REJECTED", text: "명령이 거부되었습니다." },
  { code: "NO_OPEN_TIER1_CARD", text: "예약할 공개 티어 1 카드가 없습니다." },
  { code: "NO_RESERVED_CARD", text: "구매할 예약 카드가 없습니다." },
  { code: "SOCKET_ERROR", text: "실시간 연결 중 오류가 발생했습니다." },
  {
    code: "SOCKET_MESSAGE_PARSE_FAILED",
    text: "실시간 메시지를 해석하지 못했습니다.",
  },
];

export function toKoreanErrorMessage(raw: string | null | undefined): string {
  const normalizedRaw = raw?.trim() ?? "";
  if (!normalizedRaw) {
    return "알 수 없는 오류가 발생했습니다.";
  }

  const upperRaw = normalizedRaw.toUpperCase();
  for (const item of ERROR_MESSAGE_MAP) {
    if (upperRaw.includes(item.code)) {
      return `${item.text} (${item.code})`;
    }
  }

  return `오류가 발생했습니다. (${normalizedRaw})`;
}
