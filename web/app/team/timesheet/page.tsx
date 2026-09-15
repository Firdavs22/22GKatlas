"use client";
import { FormEvent, useEffect, useState } from "react";
import PageLayout from "@/components/PageLayout";
import {
  Field,
  Notice,
  inputClass,
  buttonClass,
  errorText,
  localDate,
  downloadBlob,
} from "@/components/WorkUI";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
type Entry = {
  date: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  breakMinutes: number;
  plannedMinutes: number;
  actualMinutes: number | null;
  status: string;
  note: string;
  revision: number;
};
type Sheet = {
  user: { id: string; name: string };
  month: string;
  approvedAt: string | null;
  entries: Entry[];
};
const statuses: Record<string, string> = {
  work: "Работа",
  sick: "Болезнь",
  vacation: "Отпуск",
  absent: "Отсутствие",
  day_off: "Выходной",
};
export default function TimesheetPage() {
  const { user } = useAuth(),
    manager = !!user && ["admin", "superadmin"].includes(user.role);
  const [month, setMonth] = useState(localDate().slice(0, 7)),
    [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [userId, setUserId] = useState(""),
    [sheet, setSheet] = useState<Sheet | null>(null);
  const [edit, setEdit] = useState<Entry | null>(null),
    [hours, setHours] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const selected = userId || user?.id;
  async function load() {
    if (!selected || !/^\d{4}-\d{2}$/.test(month)) return;
    const { data } = await api.get("/team/timesheet", {
      params: { month, userId: selected },
    });
    setSheet(data);
  }
  useEffect(() => {
    setSheet(null);
    setEdit(null);
    load().catch((e) => setError(errorText(e)));
  }, [selected, month]);
  useEffect(() => {
    if (manager)
      api
        .get("/team/staff")
        .then((r) => setStaff(r.data))
        .catch((e) => setError(errorText(e)));
  }, [manager]);
  function open(date: string) {
    const e = sheet?.entries.find((item) => item.date === date) || {
      date,
      plannedStart: null,
      plannedEnd: null,
      breakMinutes: 0,
      plannedMinutes: 0,
      actualMinutes: null,
      status: "work",
      note: "",
      revision: 0,
    };
    setEdit({ ...e });
    setHours(e.actualMinutes === null ? "" : String(e.actualMinutes / 60));
    setError("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!edit || !selected) return;
    setBusy(true);
    setError("");
    try {
      await api.put("/team/timesheet/" + selected, {
        date: edit.date,
        revision: edit.revision,
        status: edit.status,
        note: edit.note,
        ...(hours !== ""
          ? { actualMinutes: Math.round(Number(hours) * 60) }
          : {}),
        ...(manager
          ? {
              clearPlan: !edit.plannedStart && !edit.plannedEnd,
              ...(edit.plannedStart ? { plannedStart: edit.plannedStart } : {}),
              ...(edit.plannedEnd ? { plannedEnd: edit.plannedEnd } : {}),
              breakMinutes: edit.breakMinutes,
            }
          : {}),
      });
      setEdit(null);
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function approval() {
    setBusy(true);
    setError("");
    try {
      await api.post(
        "/team/timesheet/" + (sheet?.approvedAt ? "reopen" : "approve"),
        { month, userId: selected },
      );
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const count = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  const days = Number.isFinite(count)
    ? Array.from(
        { length: count },
        (_, i) => month + "-" + String(i + 1).padStart(2, "0"),
      )
    : [];
  return (
    <PageLayout title="Табель рабочего времени" eyebrow="Команда">
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Месяц">
          <input
            type="month"
            className={inputClass}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
        {manager && (
          <Field label="Сотрудник">
            <select
              className={inputClass}
              value={selected}
              onChange={(e) => setUserId(e.target.value)}
            >
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <button
          className={buttonClass}
          disabled={!sheet || busy}
          onClick={async () => {
            try {
              const r = await api.get("/team/timesheet/export", {
                params: { month, userId: selected },
                responseType: "blob",
              });
              await downloadBlob(r.data, "Табель-" + month + ".xlsx");
            } catch (e) {
              setError(errorText(e));
            }
          }}
        >
          Скачать Excel
        </button>
        {manager && (
          <button
            className={buttonClass}
            disabled={!sheet || busy}
            onClick={approval}
          >
            {sheet?.approvedAt ? "Открыть для исправления" : "Утвердить месяц"}
          </button>
        )}
      </div>
      <Notice error={error} />
      {sheet && (
        <>
          <div className="flex flex-wrap gap-6 my-6 text-sm">
            <strong>{sheet.user.name}</strong>
            <span>
              План:{" "}
              {(
                sheet.entries.reduce((n, e) => n + e.plannedMinutes, 0) / 60
              ).toFixed(2)}{" "}
              ч
            </span>
            <span>
              Факт:{" "}
              {(
                sheet.entries.reduce((n, e) => n + (e.actualMinutes || 0), 0) /
                60
              ).toFixed(2)}{" "}
              ч
            </span>
            <span>{sheet.approvedAt ? "✓ Утверждён" : "Не утверждён"}</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            График задаёт руководитель. Фактические часы заполняет сотрудник или
            руководитель. Невнесённые дни не считаются отработанными.
          </p>
          <div className="overflow-x-auto rounded-2xl bg-white border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  {["Дата", "Смена", "План, ч", "Факт, ч", "Статус", ""].map(
                    (s, i) => (
                      <th key={i} className="p-3">
                        {s}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {days.map((date) => {
                  const e = sheet.entries.find((item) => item.date === date);
                  return (
                    <tr key={date} className="border-t border-slate-100">
                      <td className="p-3">{date}</td>
                      <td className="p-3">
                        {e?.plannedStart
                          ? e.plannedStart + "–" + e.plannedEnd
                          : "—"}
                      </td>
                      <td className="p-3">
                        {e ? (e.plannedMinutes / 60).toFixed(2) : "—"}
                      </td>
                      <td className="p-3">
                        {e?.actualMinutes == null
                          ? "Не заполнено"
                          : (e.actualMinutes / 60).toFixed(2)}
                      </td>
                      <td className="p-3">{e ? statuses[e.status] : "—"}</td>
                      <td className="p-3">
                        <button
                          className="text-brand disabled:text-slate-400"
                          disabled={!!sheet.approvedAt}
                          onClick={() => open(date)}
                        >
                          Изменить
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {edit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={save}
            className="bg-white rounded-2xl p-6 space-y-4 max-w-lg w-full max-h-[90vh] overflow-auto"
          >
            <h2 className="text-xl font-semibold">{edit.date}</h2>
            {manager && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Начало смены">
                  <input
                    type="time"
                    className={inputClass}
                    value={edit.plannedStart || ""}
                    onChange={(e) =>
                      setEdit({ ...edit, plannedStart: e.target.value })
                    }
                  />
                </Field>
                <Field label="Конец (раньше начала — следующий день)">
                  <input
                    type="time"
                    className={inputClass}
                    value={edit.plannedEnd || ""}
                    onChange={(e) =>
                      setEdit({ ...edit, plannedEnd: e.target.value })
                    }
                  />
                </Field>
                <Field label="Перерыв, минут">
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    className={inputClass}
                    value={edit.breakMinutes}
                    onChange={(e) =>
                      setEdit({ ...edit, breakMinutes: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
            )}
            <Field label="Статус">
              <select
                className={inputClass}
                value={edit.status}
                onChange={(e) => {
                  setEdit({ ...edit, status: e.target.value });
                  if (e.target.value !== "work") setHours("0");
                }}
              >
                {Object.entries(statuses).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Фактически отработано, часов">
              <input
                type="number"
                min="0"
                max="24"
                step="0.01"
                className={inputClass}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                disabled={edit.status !== "work"}
              />
            </Field>
            <Field label="Примечание">
              <textarea
                maxLength={1000}
                className={inputClass}
                value={edit.note}
                onChange={(e) => setEdit({ ...edit, note: e.target.value })}
              />
            </Field>
            <Notice error={error} />
            <div className="flex gap-3">
              <button disabled={busy} className={buttonClass}>
                Сохранить
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEdit(null)}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}
