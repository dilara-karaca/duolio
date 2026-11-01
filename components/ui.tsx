"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { ClientState, Slot } from "@/types";
import { useTheme } from "@/components/Providers";
import { useLocale, type Locale } from "@/lib/i18n";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-[#f072b6]/15 blur-3xl" />
    </div>
  );
}

export function Screen({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative min-h-dvh">
      <Backdrop />
      <div className={cx("relative mx-auto flex min-h-dvh flex-col px-4 py-5", wide ? "max-w-3xl" : "max-w-lg")}>
        {children}
      </div>
    </div>
  );
}

export function ScreenFallback({ label }: { label?: string }) {
  const { t } = useLocale();
  return (
    <Screen>
      <div className="grid flex-1 place-items-center text-sm font-medium text-muted">{label ?? t.loading}</div>
    </Screen>
  );
}

export function Wordmark() {
  return (
    <span className="text-2xl font-bold tracking-tight">
      Duo<span className="text-accent">lio</span>
    </span>
  );
}

export function HeaderTools() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <LanguageToggle />
      <ThemeToggle />
    </div>
  );
}

export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div
      role="group"
      aria-label={t.language}
      className="flex h-11 shrink-0 items-center rounded-2xl border border-line bg-card p-1 shadow-card"
    >
      {(["tr", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={cx(
            "h-9 min-w-10 rounded-xl px-2.5 text-xs font-bold tracking-wide transition",
            locale === code ? "bg-accent text-accent-ink" : "text-muted",
          )}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? t.switchToLight : t.switchToDark}
      className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-card text-lg shadow-card"
    >
      {dark ? "🌙" : "☀️"}
    </button>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex h-14 items-center justify-center rounded-2xl px-5 text-base font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        variant === "primary" && "bg-accent text-accent-ink shadow-card hover:brightness-105",
        variant === "secondary" && "border border-line bg-card text-ink shadow-card",
        variant === "ghost" && "h-11 bg-transparent px-3 text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  autoCapitalize,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoCapitalize?: string;
  maxLength?: number;
  inputMode?: "text" | "numeric";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoCapitalize={autoCapitalize}
        autoCorrect="off"
        maxLength={maxLength}
        inputMode={inputMode}
        className="h-14 w-full rounded-2xl border border-line bg-card px-4 text-base outline-none transition focus:border-accent"
      />
    </label>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-bad/10 px-4 py-3 text-sm font-medium text-bad">
      {message}
    </p>
  );
}

export function CopyButton({ label, text }: { label: string; text: string | (() => string) }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      className="h-12 flex-1"
      onClick={async () => {
        const value = typeof text === "function" ? text() : text;
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? t.copied : label}
    </Button>
  );
}

export function playerName(state: ClientState, slot: Slot) {
  return state.players.find((player) => player.slot === slot)?.nickname ?? "…";
}

export function Scoreboard({ state, large = false }: { state: ClientState; large?: boolean }) {
  const left = playerName(state, 0);
  const right = playerName(state, 1);
  return (
    <div className={cx("flex items-center justify-center gap-2 font-semibold", large ? "text-xl" : "text-sm")}>
      <span className={cx("truncate", state.yourSlot === 0 && "text-accent")}>{left}</span>
      <span className="shrink-0 tabular-nums">
        {state.scores[0]} <span className="text-muted">-</span> {state.scores[1]}
      </span>
      <span className={cx("truncate", state.yourSlot === 1 && "text-accent")}>{right}</span>
    </div>
  );
}
