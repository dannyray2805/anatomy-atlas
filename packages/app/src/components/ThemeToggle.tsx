import { nextTheme, themeActionLabel, themeName, type Theme } from "../theme";

/** Sun — shown when the button will switch TO light. */
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4.1" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 2.3v2.3" />
        <path d="M12 19.4v2.3" />
        <path d="M2.3 12h2.3" />
        <path d="M19.4 12h2.3" />
        <path d="M5.2 5.2l1.6 1.6" />
        <path d="M17.2 17.2l1.6 1.6" />
        <path d="M18.8 5.2l-1.6 1.6" />
        <path d="M6.8 17.2l-1.6 1.6" />
      </g>
    </svg>
  );
}

/** Moon — shown when the button will switch TO dark. */
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
      <path
        d="M20.2 14.3A8.3 8.3 0 0 1 9.7 3.8a8.5 8.5 0 1 0 10.5 10.5z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Light/dark switch. The icon and wording name the theme you will get, so the control says what
 * it does; the current theme is the one not offered. State lives in App.tsx (persisted).
 */
export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const target = nextTheme(theme);
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={themeActionLabel(theme)}
      title={themeActionLabel(theme)}
    >
      {target === "light" ? <SunIcon /> : <MoonIcon />}
      <span className="theme-toggle__text">{themeName(target)}</span>
    </button>
  );
}
