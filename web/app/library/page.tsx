"use client";
import { FormEvent, useEffect, useState } from "react";
import PageLayout from "@/components/PageLayout";
import {
  Field,
  Notice,
  inputClass,
  buttonClass,
  errorText,
} from "@/components/WorkUI";
import { useAuth } from "@/context/AuthContext";
import { getAuthMediaUrl } from "@/lib/media";
import api from "@/lib/api";
type Doc = {
  id?: string;
  title: string;
  kind: string;
  body: string;
  audience: string;
  published: boolean;
  attachments: string[];
  links: string[];
  revision?: number;
};
const kinds: Record<string, string> = {
  policy: "Правила сада",
  manual: "Пособие",
  curriculum: "Учебный план",
};
const audiences: Record<string, string> = {
  all: "Все пользователи",
  staff: "Все сотрудники",
  teachers: "Педагоги",
  parents: "Родители",
  specialists: "Психолог и педиатр",
};
const empty: Doc = {
  title: "",
  kind: "manual",
  body: "",
  audience: "teachers",
  published: false,
  attachments: [],
  links: [],
};
export default function LibraryPage() {
  const { user } = useAuth(),
    editor = !!user && ["admin", "superadmin", "methodist"].includes(user.role);
  const [docs, setDocs] = useState<Doc[]>([]),
    [edit, setEdit] = useState<Doc | null>(null),
    [opened, setOpened] = useState<Doc | null>(null);
  const [search, setSearch] = useState(""),
    [kind, setKind] = useState(""),
    [links, setLinks] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  async function load() {
    const { data } = await api.get("/library");
    setDocs(data);
    setLoaded(true);
  }
  useEffect(() => {
    load().catch((e) => setError(errorText(e)));
  }, []);
  function start(doc: Doc = { ...empty }) {
    setOpened(null);
    setEdit({ ...doc });
    setLinks(doc.links.join("\n"));
    setError("");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    setError("");
    const { id, ...data } = edit;
    try {
      const body = {
        ...data,
        links: links
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      // Select editable fields; server rejects accidental model/internal fields.
      const dto = {
        title: body.title,
        kind: body.kind,
        body: body.body,
        audience: body.audience,
        published: body.published,
        attachments: body.attachments,
        links: body.links,
        ...(body.revision ? { revision: body.revision } : {}),
      };
      if (id) await api.put("/library/" + id, dto);
      else await api.post("/library", dto);
      setEdit(null);
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files?.length || !edit) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const r = await api.post("/upload", form);
        urls.push(r.data.url);
      }
      setEdit((current) =>
        current
          ? { ...current, attachments: [...current.attachments, ...urls] }
          : current,
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(doc: Doc) {
    if (!confirm("Удалить материал «" + doc.title + "»?")) return;
    setBusy(true);
    try {
      await api.delete("/library/" + doc.id, {
        data: { revision: doc.revision },
      });
      setOpened(null);
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageLayout
      title={editor ? "Кабинет методиста" : "Правила и материалы"}
      eyebrow="Библиотека сада"
      actions={
        editor && (
          <button className={buttonClass} onClick={() => start()}>
            Создать материал
          </button>
        )
      }
    >
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Поиск материалов"
          placeholder="Найти правила, пособие, учебный план…"
          className={inputClass + " max-w-md"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Тип материала"
          className={inputClass + " max-w-xs"}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">Все типы</option>
          {Object.entries(kinds).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <Notice error={error} />
      {!loaded && !error ? (
        <p className="my-6">Загрузка материалов…</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
          {docs
            .filter(
              (d) =>
                (!kind || d.kind === kind) &&
                (d.title + " " + d.body)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((d) => (
              <article
                key={d.id}
                className="rounded-2xl bg-white border border-slate-200 p-5"
              >
                <span className="text-xs text-brand">{kinds[d.kind]}</span>
                <h2 className="font-semibold mt-2">{d.title}</h2>
                <p className="text-sm text-slate-500 mt-2 line-clamp-3">
                  {d.body}
                </p>
                {editor && (
                  <p className="text-xs mt-3 text-slate-500">
                    {audiences[d.audience]} ·{" "}
                    {d.published ? "Опубликован" : "Черновик"}
                  </p>
                )}
                <div className="flex gap-4 mt-4 text-sm">
                  <button
                    className="text-brand"
                    onClick={async () => {
                      try {
                        setOpened((await api.get("/library/" + d.id)).data);
                      } catch (e) {
                        setError(errorText(e));
                      }
                    }}
                  >
                    Открыть
                  </button>
                  {editor && <button onClick={() => start(d)}>Изменить</button>}
                </div>
              </article>
            ))}
          {!docs.length && (
            <p className="text-slate-500">Доступных материалов пока нет.</p>
          )}
        </div>
      )}
      {opened && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-center p-4">
          <article className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto">
            <button
              className="float-right text-brand"
              onClick={() => setOpened(null)}
            >
              Закрыть
            </button>
            <p className="text-sm text-brand mb-2">{kinds[opened.kind]}</p>
            <h2 className="text-2xl font-semibold">{opened.title}</h2>
            <p className="whitespace-pre-wrap mt-5">{opened.body}</p>
            <div className="space-y-2 mt-5">
              {opened.attachments.map((url, i) => (
                <a
                  className="block text-brand"
                  key={url}
                  href={getAuthMediaUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Вложение {i + 1}
                </a>
              ))}
              {opened.links.map((url) => (
                <a
                  className="block text-brand break-all"
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {url}
                </a>
              ))}
            </div>
            {editor && (
              <div className="flex gap-5 mt-6">
                <button onClick={() => start(opened)}>Редактировать</button>
                <button
                  disabled={busy}
                  className="text-red-700"
                  onClick={() => remove(opened)}
                >
                  Удалить
                </button>
              </div>
            )}
          </article>
        </div>
      )}
      {edit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-center p-4">
          <form
            onSubmit={save}
            className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto space-y-4"
          >
            <h2 className="text-xl font-semibold">
              {edit.id ? "Редактировать материал" : "Создать материал"}
            </h2>
            <Field label="Название">
              <input
                required
                maxLength={200}
                className={inputClass}
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Тип">
                <select
                  className={inputClass}
                  value={edit.kind}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      kind: e.target.value,
                      audience:
                        e.target.value === "policy" ? "all" : "teachers",
                    })
                  }
                >
                  {Object.entries(kinds).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Кому видно">
                <select
                  className={inputClass}
                  value={edit.audience}
                  onChange={(e) =>
                    setEdit({ ...edit, audience: e.target.value })
                  }
                >
                  {Object.entries(audiences).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="text-xs text-slate-500">
              Методист и администраторы управляют всеми материалами. «Все
              пользователи» включает родителей. Черновик доступен только
              редакторам.
            </p>
            <Field label="Содержимое">
              <textarea
                rows={8}
                maxLength={100000}
                className={inputClass}
                value={edit.body}
                onChange={(e) => setEdit({ ...edit, body: e.target.value })}
              />
            </Field>
            <Field label="Полезные ссылки (по одной на строку)">
              <textarea
                className={inputClass}
                rows={3}
                value={links}
                onChange={(e) => setLinks(e.target.value)}
              />
            </Field>
            <Field label="Пособия и вложения">
              <input
                type="file"
                multiple
                disabled={busy}
                accept=".pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,.webp"
                onChange={(e) => upload(e.target.files)}
              />
            </Field>
            {edit.attachments.map((url, i) => (
              <div className="flex justify-between text-sm" key={url}>
                <a
                  className="text-brand"
                  href={getAuthMediaUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Вложение {i + 1}
                </a>
                <button
                  type="button"
                  onClick={() =>
                    setEdit({
                      ...edit,
                      attachments: edit.attachments.filter((x) => x !== url),
                    })
                  }
                >
                  Убрать
                </button>
              </div>
            ))}
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={edit.published}
                onChange={(e) =>
                  setEdit({ ...edit, published: e.target.checked })
                }
              />
              Опубликовать для выбранной аудитории
            </label>
            <Notice error={error} />
            <div className="flex gap-4">
              <button className={buttonClass} disabled={busy}>
                Сохранить
              </button>
              <button
                disabled={busy}
                type="button"
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
