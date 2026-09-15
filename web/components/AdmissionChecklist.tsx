"use client";

import { Check, FileCheck2, Plus, X } from "lucide-react";
export type DocumentItem = {
  id: string;
  title: string;
  required: boolean;
  received: boolean;
  note?: string;
};
export type DocumentChecklist = {
  items: DocumentItem[];
  exceptionReason: string;
  checkedAt?: string;
};
const coreIds = [
  "signed_contract",
  "parent_passport",
  "birth_certificate",
  "medical_certificates",
  "personal_data_consent",
  "pickup_authorization",
];

export default function AdmissionChecklist({
  value,
  onChange,
  disabled = false,
}: {
  value: DocumentChecklist;
  onChange?: (value: DocumentChecklist) => void;
  disabled?: boolean;
}) {
  const missing = value.items.filter((item) => item.required && !item.received);
  const received = value.items.filter((item) => item.received).length;
  const update = (id: string, patch: Partial<DocumentItem>) =>
    onChange?.({
      ...value,
      items: value.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileCheck2 size={17} className="text-brand" />
            {onChange
              ? "Документы для зачисления"
              : "Документы на момент зачисления"}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Получено {received} из {value.items.length}
            {value.checkedAt
              ? ` · ${new Date(value.checkedAt).toLocaleDateString("ru-RU")}`
              : ""}
          </p>
        </div>
        <span
          className={`text-xs rounded-full px-2.5 py-1 ${missing.length ? "text-amber-800 bg-amber-50" : "text-emerald-800 bg-emerald-50"}`}
        >
          {missing.length ? `Ожидаются: ${missing.length}` : "Комплект собран"}
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {value.items.map((item) => (
          <div key={item.id} className="p-4">
            <div className="flex gap-3 items-start">
              {onChange ? (
                <input
                  aria-label={`Получен: ${item.title}`}
                  type="checkbox"
                  className="accent-brand mt-1 w-4 h-4 shrink-0"
                  checked={item.received}
                  disabled={disabled}
                  onChange={(e) =>
                    update(item.id, { received: e.target.checked })
                  }
                />
              ) : (
                <span
                  className={`mt-0.5 ${item.received ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {item.received ? (
                    <Check size={18} />
                  ) : (
                    <span className="inline-block w-4 h-4 rounded border border-amber-300" />
                  )}
                </span>
              )}
              <div className="min-w-0 flex-1">
                {onChange && !coreIds.includes(item.id) ? (
                  <input
                    aria-label="Название дополнительного документа"
                    className="w-full text-sm border-b border-slate-200 pb-1"
                    maxLength={160}
                    value={item.title}
                    disabled={disabled}
                    onChange={(e) => update(item.id, { title: e.target.value })}
                  />
                ) : (
                  <p className="text-sm font-medium">{item.title}</p>
                )}
                <p
                  className={`text-xs mt-1 ${item.received ? "text-emerald-700" : item.required ? "text-amber-800" : "text-slate-400"}`}
                >
                  {item.received
                    ? "Получен"
                    : item.required
                      ? "Обязательный · ожидается"
                      : "По необходимости"}
                </p>
                {onChange && !coreIds.includes(item.id) && (
                  <label className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <input
                      type="checkbox"
                      checked={item.required}
                      disabled={disabled}
                      onChange={(e) =>
                        update(item.id, { required: e.target.checked })
                      }
                    />
                    Обязательный
                  </label>
                )}
                {onChange ? (
                  <input
                    aria-label={`Примечание: ${item.title}`}
                    className="w-full text-xs mt-2 bg-transparent placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-brand rounded p-1"
                    placeholder="Примечание или срок предоставления"
                    maxLength={500}
                    value={item.note || ""}
                    disabled={disabled}
                    onChange={(e) => update(item.id, { note: e.target.value })}
                  />
                ) : (
                  item.note && (
                    <p className="text-xs text-slate-500 mt-2 whitespace-pre-wrap">
                      {item.note}
                    </p>
                  )
                )}
              </div>
              {onChange && !coreIds.includes(item.id) && (
                <button
                  type="button"
                  aria-label={`Убрать пункт ${item.title}`}
                  disabled={disabled}
                  className="text-slate-400 hover:text-red-600"
                  onClick={() =>
                    onChange({
                      ...value,
                      items: value.items.filter((i) => i.id !== item.id),
                    })
                  }
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {onChange && (
        <button
          type="button"
          disabled={disabled || value.items.length >= 30}
          className="flex items-center gap-2 px-4 py-3 text-sm text-brand disabled:opacity-40"
          onClick={() =>
            onChange({
              ...value,
              items: [
                ...value.items,
                {
                  id: "extra-" + crypto.randomUUID(),
                  title: "Дополнительный документ",
                  required: false,
                  received: false,
                  note: "",
                },
              ],
            })
          }
        >
          <Plus size={15} />
          Добавить документ
        </button>
      )}
      {!!missing.length && (
        <div className="bg-amber-50 border-t border-amber-100 p-4">
          <p className="text-sm text-amber-950 font-medium">
            Не хватает: {missing.map((item) => item.title).join(", ")}
          </p>
          {onChange ? (
            <label className="block text-xs text-amber-900 mt-3">
              Причина зачисления с неполным комплектом (от 10 символов)
              <textarea
                className="block mt-2 p-3 w-full rounded-xl border border-amber-200 bg-white text-sm"
                rows={2}
                maxLength={2000}
                value={value.exceptionReason}
                disabled={disabled}
                placeholder="Какие документы и к какому сроку родитель предоставит"
                onChange={(e) =>
                  onChange({ ...value, exceptionReason: e.target.value })
                }
              />
            </label>
          ) : (
            value.exceptionReason && (
              <p className="text-sm text-amber-900 mt-2 whitespace-pre-wrap">
                Комментарий администрации: {value.exceptionReason}
              </p>
            )
          )}
        </div>
      )}
      {onChange && (
        <p className="px-4 py-3 text-xs text-slate-500 bg-slate-50 border-t border-slate-100">
          Отметки подтверждают получение документов сотрудником. Файлы можно
          приложить в папке ребенка после зачисления.
        </p>
      )}
    </section>
  );
}
