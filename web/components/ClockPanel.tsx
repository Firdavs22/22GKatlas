"use client";
import DatePicker from "@/components/DatePicker";
import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { buttonClass, errorText, Field, inputClass, Notice } from "./WorkUI";

export type ClockSession = {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string | null;
  startIp: string;
  endIp: string | null;
  note: string;
};
type Status = {
  enabled: boolean;
  allowed: boolean;
  timezone: string;
  serverTime?: string;
  active: ClockSession | null;
};
export default function ClockPanel({
  own,
  manager,
  userId,
  active,
  onSaved,
}: {
  own: boolean;
  manager: boolean;
  userId: string;
  active: ClockSession | null;
  onSaved: () => Promise<void>;
}) {
  const [status, setStatus] = useState<Status | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [correction, setCorrection] = useState(false),
    [end, setEnd] = useState(""),
    [note, setNote] = useState("");
  const [now, setNow] = useState(Date.now()),
    [serverOffset, setServerOffset] = useState(0);
  const requestVersion = useRef(0);
  const load = async () => {
    const version = ++requestVersion.current;
    const { data } = await api.get("/team/clock");
    if (version !== requestVersion.current) return;
    setStatus(data);
    if (data.serverTime)
      setServerOffset(new Date(data.serverTime).getTime() - Date.now());
  };
  useEffect(() => {
    setError("");
    setCorrection(false);
    load().catch((e) => setError(errorText(e)));
  }, [userId, active?.id, active?.endedAt]);
  useEffect(() => {
    if (!own) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const refresh = () => {
      if (document.visibilityState === "visible") load().catch(() => {});
    };
    const polling = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(tick);
      clearInterval(polling);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [own]);
  const seconds = status?.active
    ? Math.max(
        0,
        Math.floor(
          (now + serverOffset - new Date(status.active.startedAt).getTime()) /
            1000,
        ),
      )
    : 0;
  const elapsed = [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
  async function punch() {
    if (busy || !status) return;
    setBusy(true);
    setError("");
    try {
      await api.post(
        "/team/clock/" + (status.active ? "stop" : "start"),
        status.active
          ? { sessionId: status.active.id }
          : { requestId: crypto.randomUUID() },
      );
      await load();
      await onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  if (!own && !active && !error) return null;
  return (
    <section className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-5 space-y-3">
      {own && !status && !error && (
        <p className="text-sm text-slate-500">
          Загрузка отметок рабочего времени…
        </p>
      )}
      {own && status && (
        <>
          <p className="font-medium">
            {status.active
              ? "Работа начата: " +
                new Date(status.active.startedAt).toLocaleString("ru-RU", {
                  timeZone: status.timezone,
                })
              : "Рабочая смена"}
          </p>
          {status.active && (
            <p
              className="font-mono tabular-nums text-3xl text-brand"
              aria-label={`Текущая длительность смены ${elapsed}`}
            >
              {elapsed}
            </p>
          )}
          <p className="text-sm text-slate-500">
            Нажмите при начале и окончании работы. Сервер сохранит время и
            рассчитает часы для табеля. Для отметки нужна рабочая сеть сада.
          </p>
          {!status.enabled ? (
            <p className="text-amber-800 text-sm">
              Учет кнопкой пока не включен. Руководителю нужно включить учет и
              указать рабочую сеть сада. До подключения можно заполнить табель
              вручную.
            </p>
          ) : (
            !status.allowed && (
              <p className="text-amber-800 text-sm">
                Подключитесь к рабочему Wi-Fi. Этот адрес сети не разрешен для
                отметок.
              </p>
            )
          )}
          <button
            type="button"
            aria-pressed={!!status.active}
            className={
              "inline-flex items-center gap-4 rounded-full px-5 py-3 text-sm font-medium transition-colors disabled:opacity-40 " +
              (status.active
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-brand text-white hover:bg-brand-soft")
            }
            disabled={busy || !status.enabled || !status.allowed}
            onClick={punch}
          >
            <span
              aria-hidden="true"
              className="relative h-6 w-11 rounded-full bg-white/25"
            >
              <span
                className={
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform " +
                  (status.active ? "translate-x-5" : "translate-x-0.5")
                }
              />
            </span>
            {busy
              ? "Сохраняю…"
              : status.active
                ? "Завершить работу"
                : "Начал работу"}
          </button>
        </>
      )}
      {manager && active && (
        <>
          <p className="text-sm">
            Открыта смена с {new Date(active.startedAt).toLocaleString("ru-RU")}
            .
          </p>
          <button
            className="text-brand underline text-sm"
            onClick={() => setCorrection(!correction)}
          >
            Завершить смену вручную
          </button>
          {correction && (
            <form
              className="space-y-3 max-w-lg"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await api.post("/team/clock/" + userId + "/close", {
                    sessionId: active.id,
                    endedAt: new Date(end).toISOString(),
                    note,
                  });
                  setCorrection(false);
                  await load();
                  await onSaved();
                } catch (e) {
                  setError(errorText(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Фактическое окончание смены">
                <DatePicker
                  required
                  type="datetime-local"
                  className={inputClass}
                  value={end}
                  onValueChange={(value) => setEnd(value)}
                />
              </Field>
              <Field label="Причина исправления">
                <textarea
                  required
                  maxLength={1000}
                  className={inputClass}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
              <button className={buttonClass} disabled={busy}>
                Сохранить окончание
              </button>
            </form>
          )}
        </>
      )}
      <Notice error={error} />
    </section>
  );
}
