"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import {
  Field,
  Notice,
  buttonClass,
  errorText,
  inputClass,
  localDate,
} from "@/components/WorkUI";

type Stage = { id: string; title: string; kind: string; position: number };
type Lead = {
  id: string;
  parentName: string;
  phone: string;
  email: string | null;
  childName: string;
  birthDate: string | null;
  direction: string;
  priority: string;
  ownerId: string | null;
  source: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  notes: string;
  nextAction: string;
  nextActionAt: string | null;
  stageId: string;
  state: string;
  revision: number;
};
type Detail = Lead & {
  history: {
    id: string;
    kind: string;
    text: string;
    createdAt: string;
    actorId: string | null;
  }[];
  enrollment: { child: { id: string; name: string }; startsOn: string } | null;
};
type Lookups = {
  owners: { id: string; name: string }[];
  groups: {
    id: string;
    name: string;
    capacity: number;
    monthlyFee: number;
    _count: { children: number };
  }[];
  parents: { id: string; name: string; email: string }[];
  children: {
    id: string;
    name: string;
    birthDate: string;
    parents: { parentId: string }[];
  }[];
};
type LeadForm = {
  [K in
    | "parentName"
    | "phone"
    | "email"
    | "childName"
    | "birthDate"
    | "direction"
    | "priority"
    | "ownerId"
    | "source"
    | "utmSource"
    | "utmMedium"
    | "utmCampaign"
    | "notes"
    | "nextAction"
    | "nextActionAt"]: string;
};
const emptyLead: LeadForm = {
  parentName: "",
  phone: "",
  email: "",
  childName: "",
  birthDate: "",
  direction: "",
  priority: "normal",
  ownerId: "",
  source: "Вручную",
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  notes: "",
  nextAction: "",
  nextActionAt: "",
};
const actionLabels: Record<string, string> = {
  note: "Заметка",
  call: "Звонок",
  message: "Сообщение",
  meeting: "Встреча",
  tour: "Экскурсия",
  created: "Создание",
  edited: "Изменение",
  stage: "Этап",
  enrolled: "Зачисление",
};
const secondary =
  "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-40";
const dateTime = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const localTime = (value?: string | null) =>
  value
    ? new Date(
        new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/40 flex justify-end"
      onClick={close}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-2xl bg-white h-full overflow-y-auto p-5 sm:p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <h2 className="text-2xl font-medium">{title}</h2>
          <button type="button" className={secondary} onClick={close}>
            Закрыть
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function CrmPage() {
  const { user } = useAuth();
  const allowed = !!user && ["admin", "superadmin"].includes(user.role);
  const [stages, setStages] = useState<Stage[]>([]),
    [leads, setLeads] = useState<Lead[]>([]);
  const [lookups, setLookups] = useState<Lookups>({
    owners: [],
    groups: [],
    parents: [],
    children: [],
  });
  const [teamEnabled, setTeamEnabled] = useState(false);
  const [view, setView] = useState<"board" | "list">("board"),
    [search, setSearch] = useState(""),
    [state, setState] = useState("open"),
    [owner, setOwner] = useState("");
  const [error, setError] = useState(""),
    [modalError, setModalError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null),
    [form, setForm] = useState<LeadForm | null>(null),
    [editing, setEditing] = useState<Lead | null>(null);
  const [activity, setActivity] = useState({
    kind: "note",
    text: "",
    nextAction: "",
    nextActionAt: "",
    addToCalendar: false,
  });
  const [enroll, setEnroll] = useState<{
    groupId: string;
    startsOn: string;
    monthlyFee: string;
    childName: string;
    birthDate: string;
    email: string;
    parentId: string;
    childId: string;
  } | null>(null);
  const [settings, setSettings] = useState(false),
    [stageForm, setStageForm] = useState({ id: "", title: "", kind: "active" });
  const load = useCallback(async () => {
    if (!allowed) return;
    try {
      const [s, l, refs, modules] = await Promise.all([
        api.get("/crm/stages"),
        api.get("/crm/leads"),
        api.get("/crm/lookups"),
        api.get("/modules"),
      ]);
      setStages(s.data);
      setLeads(l.data);
      setLookups(refs.data);
      setTeamEnabled(!!modules.data.team);
      setError("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [allowed]);
  useEffect(() => {
    load();
  }, [load]);
  // Fetch the archive only when requested; current filters are applied locally.
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    api
      .get("/crm/leads", { params: { state } })
      .then((r) => {
        if (active) setLeads(r.data);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [allowed, state]);
  async function refresh() {
    const [s, l, refs] = await Promise.all([
      api.get("/crm/stages"),
      api.get("/crm/leads", { params: { state } }),
      api.get("/crm/lookups"),
    ]);
    setStages(s.data);
    setLeads(l.data);
    setLookups(refs.data);
  }
  async function openLead(id: string) {
    setError("");
    setModalError("");
    try {
      const { data } = await api.get("/crm/leads/" + id);
      setDetail(data);
      setActivity({
        kind: "note",
        text: "",
        nextAction: data.nextAction,
        nextActionAt: localTime(data.nextActionAt),
        addToCalendar: false,
      });
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function mutate(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setModalError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      const message = errorText(e);
      setError(message);
      setModalError(message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = leads.filter(
    (l) =>
      (!owner || l.ownerId === owner) &&
      [l.parentName, l.phone, l.childName, l.direction].some((s) =>
        s.toLowerCase().includes(search.toLowerCase()),
      ),
  );
  const overdue = filtered.filter(
    (l) =>
      l.state === "open" &&
      l.nextActionAt &&
      new Date(l.nextActionAt) < new Date(),
  );
  const nextStage =
    detail &&
    stages.filter((s) => s.kind === "active")[
      stages
        .filter((s) => s.kind === "active")
        .findIndex((s) => s.id === detail.stageId) + 1
    ];
  function startForm(lead?: Lead) {
    const next = { ...emptyLead };
    if (lead)
      for (const key of Object.keys(next) as (keyof LeadForm)[])
        next[key] = lead[key] || "";
    next.birthDate = next.birthDate.slice(0, 10);
    next.nextActionAt = localTime(lead?.nextActionAt);
    setEditing(lead || null);
    setForm(next);
    setModalError("");
  }
  async function saveLead(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    await mutate(async () => {
      const data = {
        ...form,
        email: form.email || null,
        birthDate: form.birthDate || null,
        ownerId: form.ownerId || null,
        nextActionAt: form.nextActionAt
          ? new Date(form.nextActionAt).toISOString()
          : null,
        ...(editing ? { revision: editing.revision } : {}),
      };
      const result = editing
        ? await api.put("/crm/leads/" + editing.id, data)
        : await api.post("/crm/leads", data);
      setForm(null);
      setEditing(null);
      await openLead(result.data.id);
    });
  }
  async function move(lead: Lead, stageId: string) {
    await mutate(async () => {
      await api.post(`/crm/leads/${lead.id}/move`, {
        stageId,
        revision: lead.revision,
      });
      if (detail?.id === lead.id) await openLead(lead.id);
    });
  }
  function openEnrollment() {
    if (!detail) return;
    const parent = lookups.parents.find((p) => p.email === detail.email);
    setEnroll({
      groupId: "",
      startsOn: localDate(),
      monthlyFee: "",
      childName: detail.childName,
      birthDate: detail.birthDate?.slice(0, 10) || "",
      email: detail.email || "",
      parentId: parent?.id || "",
      childId: "",
    });
    setModalError("");
  }
  function leadCard(lead: Lead) {
    const due = lead.nextActionAt && new Date(lead.nextActionAt) < new Date();
    return (
      <button
        key={lead.id}
        draggable={!busy && lead.state === "open"}
        onDragStart={(e) => e.dataTransfer.setData("text/plain", lead.id)}
        onClick={() => openLead(lead.id)}
        className="block w-full text-left bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-brand focus:border-brand"
      >
        <div className="flex justify-between gap-2">
          <strong className="font-medium">{lead.parentName}</strong>
          {lead.priority === "high" && (
            <span className="text-rose-700 text-xs">Высокий</span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">{lead.phone}</p>
        <p className="text-sm mt-3">
          {lead.childName || "Имя ребёнка пока не указано"}
        </p>
        {lead.direction && (
          <p className="text-xs text-slate-500">{lead.direction}</p>
        )}
        <div
          className={
            "mt-3 text-xs rounded-lg p-2 " +
            (due && lead.state === "open"
              ? "bg-amber-50 text-amber-900"
              : "bg-slate-50 text-slate-600")
          }
        >
          {lead.nextAction || "Следующий контакт не назначен"}
          {lead.nextActionAt && (
            <p className="mt-1">
              {due ? "Срок: " : ""}
              {dateTime(lead.nextActionAt)}
            </p>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {lookups.owners.find((o) => o.id === lead.ownerId)?.name ||
            "Без ответственного"}
        </p>
      </button>
    );
  }
  if (user && !allowed)
    return (
      <PageLayout title="CRM">
        <p>Раздел доступен администрации.</p>
      </PageLayout>
    );
  return (
    <PageLayout title="Заявки родителей" eyebrow="CRM" wide>
      <div className="flex flex-wrap justify-between gap-3 mb-5">
        <p className="text-slate-500">
          От первого контакта до зачисления в группу.
        </p>
        <div className="flex gap-2 flex-wrap">
          {user?.role === "superadmin" && (
            <button
              className={secondary}
              onClick={() => {
                setSettings(true);
                setModalError("");
              }}
            >
              Настроить этапы
            </button>
          )}
          <button className={buttonClass} onClick={() => startForm()}>
            Новая заявка
          </button>
        </div>
      </div>
      <Notice error={error} />
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          aria-label="Поиск заявок"
          className={inputClass + " sm:!w-64"}
          placeholder="Родитель, ребёнок, телефон"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Ответственный"
          className={inputClass + " sm:!w-52"}
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        >
          <option value="">Все ответственные</option>
          {lookups.owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Состояние заявок"
          className={inputClass + " sm:!w-44"}
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="open">В работе</option>
          <option value="won">Зачислены</option>
          <option value="all">Все заявки</option>
        </select>
        <button
          className={secondary}
          onClick={() => setView(view === "board" ? "list" : "board")}
        >
          {view === "board" ? "Показать списком" : "Показать доской"}
        </button>
      </div>
      {overdue.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-5">
          <strong className="text-amber-900">
            Контакт просрочен: {overdue.length}
          </strong>
          <div className="flex gap-2 flex-wrap mt-2">
            {overdue.slice(0, 8).map((l) => (
              <button
                key={l.id}
                className="text-sm underline text-amber-900"
                onClick={() => openLead(l.id)}
              >
                {l.parentName}
              </button>
            ))}
          </div>
        </div>
      )}
      {loading ? (
        <p className="py-12 text-slate-500">Загрузка заявок…</p>
      ) : view === "board" && state === "open" ? (
        <div className="flex gap-4 overflow-x-auto pb-6 items-start">
          {stages.map((s) => (
            <section
              key={s.id}
              className="bg-slate-100/80 rounded-2xl p-3 w-72 shrink-0 min-h-64"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const lead = leads.find(
                  (l) => l.id === e.dataTransfer.getData("text/plain"),
                );
                if (lead && !busy) void move(lead, s.id);
              }}
            >
              <h2 className="flex justify-between px-1 py-2 text-sm font-semibold">
                <span>{s.title}</span>
                <span className="text-slate-400">
                  {filtered.filter((l) => l.stageId === s.id).length}
                </span>
              </h2>
              <div className="space-y-3 mt-2">
                {filtered.filter((l) => l.stageId === s.id).map(leadCard)}
              </div>
              {!filtered.some((l) => l.stageId === s.id) && (
                <p className="text-xs text-slate-400 text-center py-8">
                  Заявок пока нет
                </p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <div key={l.id}>
              <p className="text-xs text-slate-500 mb-2">
                {l.state === "won"
                  ? "Зачислен"
                  : stages.find((s) => s.id === l.stageId)?.title}
              </p>
              {leadCard(l)}
            </div>
          ))}
          {!filtered.length && (
            <p className="text-slate-500 py-8">Заявок не найдено.</p>
          )}
        </div>
      )}

      {detail && !form && !enroll && (
        <Modal title={detail.parentName} close={() => setDetail(null)}>
          <Notice error={modalError} />
          <div className="flex flex-wrap gap-3 text-sm">
            <a className="text-brand" href={"tel:" + detail.phone}>
              {detail.phone}
            </a>
            {detail.email && (
              <a className="text-brand" href={"mailto:" + detail.email}>
                {detail.email}
              </a>
            )}
          </div>
          <p className="mt-4 text-lg">
            {detail.childName || "Ребёнок не указан"}
          </p>
          <p className="text-sm text-slate-500">
            {detail.birthDate &&
              new Date(detail.birthDate).toLocaleDateString("ru-RU")}
            {detail.direction && " · " + detail.direction}
          </p>
          {detail.notes && (
            <p className="whitespace-pre-wrap bg-slate-50 rounded-xl p-4 my-4 text-sm">
              {detail.notes}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-4">
            Источник: {detail.source || "Не указан"}
            {detail.utmSource &&
              ` · ${detail.utmSource} / ${detail.utmMedium} / ${detail.utmCampaign}`}
          </p>
          {detail.state === "won" ? (
            <div className="my-6 bg-emerald-50 rounded-xl p-4">
              <p className="font-medium text-emerald-900">
                Зачисление завершено
              </p>
              {detail.enrollment && (
                <Link
                  className="text-brand underline block mt-2"
                  href={"/admin/children/" + detail.enrollment.child.id}
                >
                  Открыть ребёнка в портале
                </Link>
              )}
              <p className="text-sm mt-2">
                Для доступа родителя отправьте приглашение из раздела
                «Родители».
              </p>
            </div>
          ) : (
            <>
              <div className="my-5 space-y-3">
                <Field label="Этап">
                  <select
                    disabled={busy}
                    className={inputClass}
                    value={detail.stageId}
                    onChange={(e) => move(detail, e.target.value)}
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={secondary}
                    onClick={() => startForm(detail)}
                  >
                    Редактировать
                  </button>
                  {nextStage && (
                    <button
                      disabled={busy}
                      className={secondary}
                      onClick={() => move(detail, nextStage.id)}
                    >
                      Далее: {nextStage.title}
                    </button>
                  )}
                  <button
                    disabled={busy}
                    className={buttonClass}
                    onClick={openEnrollment}
                  >
                    Зачислить
                  </button>
                </div>
              </div>
              <form
                className="border-y border-slate-200 py-6 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(async () => {
                    await api.post(`/crm/leads/${detail.id}/activity`, {
                      ...activity,
                      nextActionAt: activity.nextActionAt
                        ? new Date(activity.nextActionAt).toISOString()
                        : null,
                      revision: detail.revision,
                    });
                    await openLead(detail.id);
                  });
                }}
              >
                <h3 className="font-medium">
                  Результат контакта и следующий шаг
                </h3>
                <select
                  aria-label="Тип контакта"
                  className={inputClass}
                  value={activity.kind}
                  onChange={(e) =>
                    setActivity({ ...activity, kind: e.target.value })
                  }
                >
                  {["note", "call", "message", "meeting", "tour"].map((k) => (
                    <option key={k} value={k}>
                      {actionLabels[k]}
                    </option>
                  ))}
                </select>
                <textarea
                  required
                  maxLength={5000}
                  aria-label="Результат контакта"
                  placeholder="О чём договорились"
                  className={inputClass}
                  rows={3}
                  value={activity.text}
                  onChange={(e) =>
                    setActivity({ ...activity, text: e.target.value })
                  }
                />
                <Field label="Следующий шаг">
                  <input
                    className={inputClass}
                    maxLength={200}
                    value={activity.nextAction}
                    onChange={(e) =>
                      setActivity({ ...activity, nextAction: e.target.value })
                    }
                  />
                </Field>
                <Field label="Дата следующего контакта">
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={activity.nextActionAt}
                    onChange={(e) =>
                      setActivity({ ...activity, nextActionAt: e.target.value })
                    }
                  />
                </Field>
                {teamEnabled && (
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={activity.addToCalendar}
                      onChange={(e) =>
                        setActivity({
                          ...activity,
                          addToCalendar: e.target.checked,
                        })
                      }
                    />
                    Добавить встречу в календарь (1 час, участники: я и
                    ответственный)
                  </label>
                )}
                <button disabled={busy} className={buttonClass}>
                  Сохранить контакт
                </button>
                <p className="text-xs text-slate-400">
                  Запись фиксирует контакт в истории. Звонок или сообщение
                  выполняется через ваш канал связи.
                </p>
              </form>
            </>
          )}
          <h3 className="font-medium mt-6 mb-4">История заявки</h3>
          <ol className="space-y-4">
            {detail.history.map((h) => (
              <li key={h.id} className="border-l-2 border-slate-200 pl-4">
                <p className="text-xs text-slate-400">
                  {actionLabels[h.kind] || h.kind} · {dateTime(h.createdAt)} ·{" "}
                  {lookups.owners.find((o) => o.id === h.actorId)?.name ||
                    (h.actorId ? "Администратор" : "Приём заявок")}
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{h.text}</p>
              </li>
            ))}
          </ol>
        </Modal>
      )}

      {form && (
        <Modal
          title={editing ? "Редактирование заявки" : "Новая заявка"}
          close={() => {
            if (!busy) setForm(null);
          }}
        >
          <Notice error={modalError} />
          <form onSubmit={saveLead} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {(
                [
                  "parentName",
                  "phone",
                  "email",
                  "childName",
                  "birthDate",
                  "direction",
                ] as const
              ).map((k) => (
                <Field
                  key={k}
                  label={
                    {
                      parentName: "Имя родителя *",
                      phone: "Телефон *",
                      email: "Email родителя",
                      childName: "Имя ребёнка",
                      birthDate: "Дата рождения",
                      direction: "Направление",
                    }[k]
                  }
                >
                  <input
                    className={inputClass}
                    type={
                      k === "email"
                        ? "email"
                        : k === "birthDate"
                          ? "date"
                          : k === "phone"
                            ? "tel"
                            : "text"
                    }
                    maxLength={k === "phone" ? 40 : 120}
                    required={k === "parentName" || k === "phone"}
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  />
                </Field>
              ))}
              <Field label="Приоритет">
                <select
                  className={inputClass}
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  <option value="low">Низкий</option>
                  <option value="normal">Обычный</option>
                  <option value="high">Высокий</option>
                </select>
              </Field>
              <Field label="Ответственный">
                <select
                  className={inputClass}
                  value={form.ownerId}
                  onChange={(e) =>
                    setForm({ ...form, ownerId: e.target.value })
                  }
                >
                  <option value="">Не назначен</option>
                  {lookups.owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Источник заявки">
              <input
                className={inputClass}
                maxLength={120}
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
            </Field>
            <details>
              <summary className="text-sm text-slate-500 cursor-pointer">
                Рекламные метки UTM
              </summary>
              <div className="grid gap-3 mt-3">
                {(["utmSource", "utmMedium", "utmCampaign"] as const).map(
                  (k) => (
                    <Field key={k} label={k}>
                      <input
                        maxLength={300}
                        className={inputClass}
                        value={form[k]}
                        onChange={(e) =>
                          setForm({ ...form, [k]: e.target.value })
                        }
                      />
                    </Field>
                  ),
                )}
              </div>
            </details>
            <Field label="Заметки">
              <textarea
                rows={3}
                maxLength={10000}
                className={inputClass}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <Field label="Следующий шаг">
              <input
                maxLength={200}
                className={inputClass}
                value={form.nextAction}
                onChange={(e) =>
                  setForm({ ...form, nextAction: e.target.value })
                }
              />
            </Field>
            <Field label="Дата контакта">
              <input
                type="datetime-local"
                className={inputClass}
                value={form.nextActionAt}
                onChange={(e) =>
                  setForm({ ...form, nextActionAt: e.target.value })
                }
              />
            </Field>
            <button className={buttonClass} disabled={busy}>
              {busy ? "Сохраняю…" : "Сохранить заявку"}
            </button>
          </form>
        </Modal>
      )}

      {enroll && detail && (
        <Modal
          title="Зачисление в сад"
          close={() => {
            if (!busy) setEnroll(null);
          }}
        >
          <Notice error={modalError} />
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(async () => {
                await api.post(`/crm/leads/${detail.id}/enroll`, {
                  groupId: enroll.groupId,
                  startsOn: enroll.startsOn,
                  monthlyFee:
                    enroll.monthlyFee === ""
                      ? undefined
                      : Number(enroll.monthlyFee),
                  childName: enroll.childName,
                  birthDate: enroll.birthDate,
                  email: enroll.email || undefined,
                  parentId: enroll.parentId || undefined,
                  childId: enroll.childId || undefined,
                  revision: detail.revision,
                });
                setEnroll(null);
                await openLead(detail.id);
              });
            }}
          >
            <p className="text-sm text-slate-500">
              Ребёнок появится в выбранной группе основного портала. Заявка
              сохранится в разделе «Зачислены».
            </p>
            <Field label="Группа *">
              <select
                required
                className={inputClass}
                value={enroll.groupId}
                onChange={(e) =>
                  setEnroll({
                    ...enroll,
                    groupId: e.target.value,
                    monthlyFee: String(
                      lookups.groups.find((g) => g.id === e.target.value)
                        ?.monthlyFee ?? "",
                    ),
                  })
                }
              >
                <option value="">Выберите группу</option>
                {lookups.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} · занято {g._count.children} из {g.capacity}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Начало посещения *">
                <input
                  required
                  type="date"
                  className={inputClass}
                  value={enroll.startsOn}
                  onChange={(e) =>
                    setEnroll({ ...enroll, startsOn: e.target.value })
                  }
                />
              </Field>
              <Field label="Плата в месяц, ₽">
                <input
                  type="number"
                  min="0"
                  max="99999999"
                  step="0.01"
                  className={inputClass}
                  value={enroll.monthlyFee}
                  onChange={(e) =>
                    setEnroll({ ...enroll, monthlyFee: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Родитель в портале">
              <select
                className={inputClass}
                value={enroll.parentId}
                onChange={(e) =>
                  setEnroll({
                    ...enroll,
                    parentId: e.target.value,
                    childId: "",
                  })
                }
              >
                <option value="">Новый родитель / поиск по email</option>
                {lookups.parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.email}
                  </option>
                ))}
              </select>
            </Field>
            {!enroll.parentId && (
              <Field label="Email для кабинета родителя *">
                <input
                  required
                  type="email"
                  className={inputClass}
                  value={enroll.email}
                  onChange={(e) =>
                    setEnroll({ ...enroll, email: e.target.value })
                  }
                />
              </Field>
            )}
            {enroll.parentId && (
              <Field label="Ребёнок в портале">
                <select
                  className={inputClass}
                  value={enroll.childId}
                  onChange={(e) => {
                    const child = lookups.children.find(
                      (c) => c.id === e.target.value,
                    );
                    setEnroll({
                      ...enroll,
                      childId: e.target.value,
                      ...(child
                        ? {
                            childName: child.name,
                            birthDate: child.birthDate.slice(0, 10),
                          }
                        : {}),
                    });
                  }}
                >
                  <option value="">Добавить нового ребёнка</option>
                  {lookups.children
                    .filter((c) =>
                      c.parents.some((p) => p.parentId === enroll.parentId),
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            <Field label="Имя ребёнка *">
              <input
                required
                disabled={!!enroll.childId}
                maxLength={160}
                className={inputClass}
                value={enroll.childName}
                onChange={(e) =>
                  setEnroll({ ...enroll, childName: e.target.value })
                }
              />
            </Field>
            <Field label="Дата рождения *">
              <input
                required
                disabled={!!enroll.childId}
                type="date"
                className={inputClass}
                value={enroll.birthDate}
                onChange={(e) =>
                  setEnroll({ ...enroll, birthDate: e.target.value })
                }
              />
            </Field>
            <button className={buttonClass} disabled={busy}>
              {busy ? "Зачисляю…" : "Подтвердить зачисление"}
            </button>
          </form>
        </Modal>
      )}

      {settings && (
        <Modal title="Этапы CRM" close={() => setSettings(false)}>
          <Notice error={modalError} />
          <p className="text-sm text-slate-500 mb-5">
            Рабочие этапы определяют порядок кнопки «Далее». Отложенные заявки и
            отказы остаются на доске.
          </p>
          <div className="space-y-2">
            {stages.map((s, i) => (
              <div
                key={s.id}
                className="flex gap-2 items-center border rounded-xl p-3"
              >
                <button
                  className="text-left flex-1 text-sm"
                  onClick={() =>
                    setStageForm({ id: s.id, title: s.title, kind: s.kind })
                  }
                >
                  {s.title}
                  <span className="block text-xs text-slate-400">
                    {s.kind === "active"
                      ? "Рабочий"
                      : s.kind === "lost"
                        ? "Отказ"
                        : "Отложенный"}
                  </span>
                </button>
                {[-1, 1].map((delta) => (
                  <button
                    key={delta}
                    aria-label={
                      (delta === -1 ? "Поднять " : "Опустить ") + s.title
                    }
                    disabled={
                      busy || i + delta < 0 || i + delta >= stages.length
                    }
                    className="p-2 disabled:opacity-20"
                    onClick={() =>
                      mutate(async () => {
                        const ids = stages.map((x) => x.id);
                        [ids[i], ids[i + delta]] = [ids[i + delta], ids[i]];
                        await api.put("/crm/stages/order", { ids });
                      })
                    }
                  >
                    {delta === -1 ? "↑" : "↓"}
                  </button>
                ))}
                <button
                  disabled={busy}
                  className="text-xs text-rose-700"
                  onClick={() => {
                    if (
                      window.confirm("Удалить пустой этап «" + s.title + "»?")
                    )
                      void mutate(async () => {
                        await api.delete("/crm/stages/" + s.id);
                      });
                  }}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
          <form
            className="space-y-3 mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(async () => {
                const data = { title: stageForm.title, kind: stageForm.kind };
                if (stageForm.id)
                  await api.put("/crm/stages/" + stageForm.id, data);
                else await api.post("/crm/stages", data);
                setStageForm({ id: "", title: "", kind: "active" });
              });
            }}
          >
            <h3 className="font-medium">
              {stageForm.id ? "Изменить этап" : "Добавить этап"}
            </h3>
            <input
              aria-label="Название этапа"
              required
              maxLength={80}
              className={inputClass}
              value={stageForm.title}
              onChange={(e) =>
                setStageForm({ ...stageForm, title: e.target.value })
              }
            />
            <select
              aria-label="Тип этапа"
              className={inputClass}
              value={stageForm.kind}
              onChange={(e) =>
                setStageForm({ ...stageForm, kind: e.target.value })
              }
            >
              <option value="active">Рабочий этап</option>
              <option value="deferred">Связаться позже</option>
              <option value="lost">Отказ</option>
            </select>
            <div className="flex gap-2">
              <button disabled={busy} className={buttonClass}>
                Сохранить этап
              </button>
              {stageForm.id && (
                <button
                  type="button"
                  className={secondary}
                  onClick={() =>
                    setStageForm({ id: "", title: "", kind: "active" })
                  }
                >
                  Отменить выбор
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </PageLayout>
  );
}
