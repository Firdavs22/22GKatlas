"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import PageLayout from "@/components/PageLayout";
import {
  Field,
  Notice,
  inputClass,
  buttonClass,
  errorText,
  localDate,
} from "@/components/WorkUI";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
type Event = {
  id?: string;
  title: string;
  description: string;
  kind: string;
  startsAt: string;
  endsAt: string;
  visibility: string;
  participantIds: string[];
  reminderMinutes: number;
  revision?: number;
  authorId?: string;
};
const toInput = (value: string) => {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export default function TeamCalendar({
  initialScope = "all",
}: {
  initialScope?: "all" | "personal" | "common";
}) {
  const [scope, setScope] = useState(initialScope);
  useEffect(() => {
    setScope(initialScope);
  }, [initialScope]);
  const { user } = useAuth(),
    manager = !!user && ["superadmin", "director"].includes(user.role);
  const [month, setMonth] = useState(localDate().slice(0, 7)),
    [events, setEvents] = useState<Event[]>([]),
    [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [edit, setEdit] = useState<Event | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [day, setDay] = useState("");
  const requestVersion = useRef(0);
  async function load() {
    const version = ++requestVersion.current;
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    const start = new Date(month + "-01T00:00:00"),
      end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const r = await api.get("/team/events", {
      params: {
        from: start.toISOString(),
        to: end.toISOString(),
        scope: scope === "all" ? undefined : scope,
      },
    });
    if (version === requestVersion.current) {
      setEvents(r.data);
      setLoaded(true);
    }
  }
  useEffect(() => {
    setDay("");
    setLoaded(false);
    setEvents([]);
    setEdit(null);
    setError("");
    load().catch((e) => setError(errorText(e)));
    return () => {
      requestVersion.current++;
    };
  }, [month, scope, user?.id]);
  useEffect(() => {
    api
      .get("/team/staff")
      .then((r) => setStaff(r.data))
      .catch((e) => setError(errorText(e)));
  }, []);
  function create() {
    setError("");
    const start =
      (day ||
        (month === localDate().slice(0, 7) ? localDate() : month + "-01")) +
      "T09:00";
    setEdit({
      title: "",
      description: "",
      kind: "meeting",
      startsAt: start,
      endsAt: start.slice(0, 11) + "10:00",
      visibility: scope === "common" ? "staff" : "participants",
      participantIds: user ? [user.id] : [],
      reminderMinutes: 30,
    });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    setError("");
    const { id, authorId, ...form } = edit;
    try {
      const body = {
        title: form.title,
        description: form.description,
        kind: form.kind,
        visibility: form.visibility,
        participantIds: form.participantIds,
        reminderMinutes: form.reminderMinutes,
        ...(form.revision ? { revision: form.revision } : {}),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      };
      if (id) await api.put("/team/events/" + id, body);
      else await api.post("/team/events", body);
      setEdit(null);
      const savedScope = body.visibility === "staff" ? "common" : "personal";
      if (scope !== "all" && scope !== savedScope) setScope(savedScope);
      else await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function cancel(event: Event) {
    if (!confirm("Отменить встречу «" + event.title + "»?")) return;
    setBusy(true);
    try {
      await api.post("/team/events/" + event.id + "/cancel", {
        revision: event.revision,
      });
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const first = new Date(month + "-01T12:00:00"),
    count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  return (
    <PageLayout
      title="Календарь"
      eyebrow="Встречи · Планы · Мероприятия"
      actions={
        <button className={buttonClass} onClick={create}>
          Добавить событие
        </button>
      }
    >
      <p className="text-sm text-slate-600 mb-4">
        Личные события видны автору, приглашенным участникам и руководству.
        Общие события видит вся команда.
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div
          role="group"
          aria-label="События календаря"
          className="inline-flex rounded-full border border-slate-200 bg-white p-1"
        >
          {(
            [
              ["all", "Все"],
              ["personal", "Личные"],
              ["common", "Общие"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={busy}
              aria-pressed={scope === value}
              onClick={() => setScope(value)}
              className={
                "rounded-full px-4 py-2 text-sm transition-colors " +
                (scope === value
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-50")
              }
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-violet-700 inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          Личные
        </span>
        <span className="text-xs text-teal-700 inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal-500" />
          Общие
        </span>
      </div>
      <div className="flex gap-4 items-center">
        <input
          aria-label="Месяц"
          type="month"
          className={inputClass + " max-w-xs"}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        {day && (
          <button className="text-brand" onClick={() => setDay("")}>
            Весь месяц
          </button>
        )}
      </div>
      <Notice error={error} />
      <p className="text-xs text-slate-500 my-3">
        Время: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Напоминания
        появляются в разделе «Уведомления».
      </p>
      {Number.isFinite(count) && (
        <div className="grid grid-cols-7 rounded-2xl overflow-hidden border border-slate-200 bg-white mb-6">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
            <div key={d} className="p-2 text-center text-xs bg-slate-50">
              {d}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div key={"empty" + i} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const date = month + "-" + String(i + 1).padStart(2, "0"),
              items = events.filter(
                (e) =>
                  localDate(new Date(e.startsAt)) <= date &&
                  localDate(new Date(e.endsAt)) >= date,
              );
            return (
              <button
                key={date}
                className={
                  "min-h-20 text-left p-2 border-t border-r border-slate-100 " +
                  (day === date ? "bg-brand-pale" : "")
                }
                onClick={() => setDay(date)}
              >
                <span className="text-sm">{i + 1}</span>
                {items.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    className={
                      "block rounded px-1 mt-1 text-[10px] sm:text-xs truncate " +
                      (e.visibility === "staff"
                        ? "bg-teal-50 text-teal-800"
                        : "bg-violet-50 text-violet-800")
                    }
                    title={
                      (e.visibility === "staff" ? "Общее: " : "Личное: ") +
                      e.title
                    }
                  >
                    {e.title}
                  </span>
                ))}
                {items.length > 2 && (
                  <span className="text-xs">+{items.length - 2}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {!loaded ? (
        <p>Загрузка календаря…</p>
      ) : (
        <div className="space-y-3">
          {events
            .filter(
              (e) =>
                !day ||
                (localDate(new Date(e.startsAt)) <= day &&
                  localDate(new Date(e.endsAt)) >= day),
            )
            .map((e) => (
              <article
                key={e.id}
                className={
                  "rounded-2xl bg-white border p-5 border-l-4 " +
                  (e.visibility === "staff"
                    ? "border-teal-200 border-l-teal-500"
                    : "border-violet-200 border-l-violet-500")
                }
              >
                <div className="flex justify-between gap-3">
                  <h2 className="font-semibold">{e.title}</h2>
                  <span className="text-xs text-slate-500">
                    {e.visibility === "staff"
                      ? "Общее · вся команда"
                      : "Личное · по участникам"}
                  </span>
                </div>
                <p className="text-sm text-brand my-2">
                  {new Date(e.startsAt).toLocaleString("ru-RU")} —{" "}
                  {new Date(e.endsAt).toLocaleString("ru-RU")}
                </p>
                <p className="text-sm whitespace-pre-wrap">{e.description}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {e.visibility === "staff"
                    ? "Все сотрудники"
                    : staff
                        .filter((s) => e.participantIds.includes(s.id))
                        .map((s) => s.name)
                        .join(", ")}
                </p>
                {(manager || e.authorId === user?.id) && (
                  <div className="flex gap-4 mt-3 text-sm">
                    <button
                      className="text-brand"
                      onClick={() => {
                        setError("");
                        setEdit({
                          ...e,
                          startsAt: toInput(e.startsAt),
                          endsAt: toInput(e.endsAt),
                        });
                      }}
                    >
                      Изменить
                    </button>
                    <button
                      disabled={busy}
                      className="text-red-700"
                      onClick={() => cancel(e)}
                    >
                      Отменить событие
                    </button>
                  </div>
                )}
              </article>
            ))}
          {!events.length && (
            <p className="p-8 text-slate-500">
              Нет событий для выбранного фильтра в этом месяце.
            </p>
          )}
        </div>
      )}
      {edit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-center p-4">
          <form
            onSubmit={save}
            className="bg-white rounded-2xl p-6 space-y-4 w-full max-w-xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-semibold">
              {edit.id ? "Изменить событие" : "Новое событие"}
            </h2>
            <Field label="Название">
              <input
                required
                maxLength={160}
                className={inputClass}
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </Field>
            <Field label="Тип">
              <select
                className={inputClass}
                value={edit.kind}
                onChange={(e) => setEdit({ ...edit, kind: e.target.value })}
              >
                <option value="meeting">Встреча</option>
                <option value="event">Мероприятие</option>
                <option value="plan">План работы</option>
              </select>
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Начало">
                <input
                  required
                  type="datetime-local"
                  className={inputClass}
                  value={edit.startsAt}
                  onChange={(e) =>
                    setEdit({ ...edit, startsAt: e.target.value })
                  }
                />
              </Field>
              <Field label="Конец">
                <input
                  required
                  type="datetime-local"
                  className={inputClass}
                  value={edit.endsAt}
                  onChange={(e) => setEdit({ ...edit, endsAt: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Личное или общее событие">
              <select
                className={inputClass}
                value={edit.visibility}
                onChange={(e) =>
                  setEdit({ ...edit, visibility: e.target.value })
                }
              >
                <option value="participants">
                  Личное — я и выбранные участники
                </option>
                <option value="staff">Общее — вся команда</option>
              </select>
            </Field>
            {edit.visibility === "participants" && (
              <fieldset className="max-h-40 overflow-auto border rounded-xl p-3">
                <legend className="text-sm">Кого пригласить</legend>
                <p className="text-xs text-slate-500 mb-2">
                  Без других участников событие останется вашим личным.
                  Руководство также имеет доступ.
                </p>
                {staff.map((s) => (
                  <label className="block text-sm py-1" key={s.id}>
                    <input
                      type="checkbox"
                      checked={edit.participantIds.includes(s.id)}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          participantIds: e.target.checked
                            ? [...edit.participantIds, s.id]
                            : edit.participantIds.filter((id) => id !== s.id),
                        })
                      }
                    />{" "}
                    {s.name}
                  </label>
                ))}
              </fieldset>
            )}
            <Field label="Напомнить">
              <select
                className={inputClass}
                value={edit.reminderMinutes}
                onChange={(e) =>
                  setEdit({ ...edit, reminderMinutes: Number(e.target.value) })
                }
              >
                {[
                  [0, "Без напоминания"],
                  [15, "За 15 минут"],
                  [30, "За 30 минут"],
                  [60, "За час"],
                  [1440, "За сутки"],
                ].map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Описание">
              <textarea
                rows={3}
                maxLength={5000}
                className={inputClass}
                value={edit.description}
                onChange={(e) =>
                  setEdit({ ...edit, description: e.target.value })
                }
              />
            </Field>
            <Notice error={error} />
            <div className="flex gap-4">
              <button className={buttonClass} disabled={busy}>
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
