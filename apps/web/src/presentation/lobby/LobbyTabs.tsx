import styles from "./Lobby.module.css";
import { KO_TEXT } from "../i18n/ko";

export type LobbyTab = "your-turn" | "waiting" | "completed";

interface LobbyTabsProps {
  active: LobbyTab;
  onChange(tab: LobbyTab): void;
}

const TABS: Array<{ id: LobbyTab; label: string }> = [
  { id: "your-turn", label: KO_TEXT.lobby.tabs.yourTurn },
  { id: "waiting", label: KO_TEXT.lobby.tabs.waiting },
  { id: "completed", label: KO_TEXT.lobby.tabs.completed },
];

export function LobbyTabs({ active, onChange }: LobbyTabsProps) {
  return (
    <nav className={styles.tabs} aria-label="로비 필터 탭">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={styles.tab}
          data-active={active === tab.id ? "true" : "false"}
          onClick={() => {
            onChange(tab.id);
          }}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
