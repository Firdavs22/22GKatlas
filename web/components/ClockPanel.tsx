"use client";
import { useEffect, useState } from "react";
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
  const load = async () => {
    const { data } = await api.get("/team/clock");
    setStatus(data);
  };
  useEffect(() => {
    setError("");
    setCorrection(false);
    load().catch((e) => setError(errorText(e)));
  }, [userId, active?.id, active?.endedAt]);
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
  if (!status?.enabled && !active && !error) return null;
  return (
    <section className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-5 space-y-3">
      {own && status?.enabled && (
        <>
          <p className="font-medium">
            {status.active
              ? "Работа начата: " +
                new Date(status.active.startedAt).toLocaleString("ru-RU", {
                  timeZone: status.timezone,
                })
              : "Отметка рабочего времени"}
          </p>
          <p className="text-sm text-slate-500">
            Время фиксируется сервером. Для обеих отметок нужна рабочая сеть
            сада.
          </p>
          {!status.allowed && (
            <p className="text-amber-800 text-sm">
              Подключитесь к рабочему Wi-Fi. Этот адрес сети не разрешён для
              отметок.
            </p>
          )}
          <button
            className={buttonClass}
            disabled={busy || !status.allowed}
            onClick={punch}
          >
            {busy
              ? "Сохраняю…"
              : status.active
                ? "Завершил работу"
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
                <input
                  required
                  type="datetime-local"
                  className={inputClass}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
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
