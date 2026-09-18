"use client";
import { useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { localDate } from "./WorkUI";

type Props = {
  type: "date" | "datetime-local" | "month";
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  "aria-label"?: string;
};
const months = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
export default function DatePicker({
  type,
  value,
  onValueChange,
  className = "",
  required,
  disabled,
  min,
  max,
  "aria-label": label = "Выбрать дату",
}: Props) {
  const [open, setOpen] = useState(false),
    [cursor, setCursor] = useState((value || localDate()).slice(0, 7));
  const [invalid, setInvalid] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [year, month] = cursor.split("-").map(Number);
  const first = new Date(year, month - 1, 1, 12);
  const count = new Date(year, month, 0).getDate(),
    offset = (first.getDay() + 6) % 7;
  const dateValue = value.slice(0, 10),
    time = value.slice(11, 16);
  const formatted = value
    ? type === "month"
      ? `${months[Number(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}`
      : new Date(dateValue + "T12:00:00").toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
    : "Выбрать дату";
  function move(delta: number) {
    setCursor(localDate(new Date(year, month - 1 + delta, 1, 12)).slice(0, 7));
  }
  function choose(date: string) {
    onValueChange(
      type === "datetime-local" ? `${date}T${time || "09:00"}` : date,
    );
    setOpen(false);
    setInvalid(false);
    trigger.current?.focus();
  }
  const unavailable = (date: string) =>
    !!(
      (min && date < min.slice(0, date.length)) ||
      (max && date > max.slice(0, date.length))
    );
  return (
    <span
      className="relative block min-w-0"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      {/* Keep native form validation; the visible calendar handles selection. */}
      <input
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute h-px w-px opacity-0 pointer-events-none"
        onChange={(e) => onValueChange(e.target.value)}
        onInvalid={(e) => {
          e.preventDefault();
          setInvalid(true);
          setOpen(true);
          trigger.current?.focus();
        }}
      />
      <span className="flex gap-2 items-center">
        <button
          ref={trigger}
          type="button"
          disabled={disabled}
          aria-label={label}
          aria-expanded={open}
          aria-controls={id}
          aria-invalid={invalid}
          className={`${className} inline-flex items-center justify-between gap-2 text-left disabled:opacity-60`}
          onClick={() => {
            if (!open) setCursor((value || localDate()).slice(0, 7));
            setOpen(!open);
          }}
        >
          <span className="truncate">{formatted}</span>
          <CalendarDays size={17} className="shrink-0 text-slate-500" />
        </button>
        {type === "datetime-local" && (
          <input
            aria-label="Время"
            type="time"
            required={required}
            disabled={disabled || !dateValue}
            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm w-28"
            value={time}
            onChange={(e) => {
              if (e.target.value)
                onValueChange(`${dateValue}T${e.target.value}`);
            }}
          />
        )}
      </span>
      {invalid && (
        <span role="alert" className="block text-xs text-red-700 mt-1">
          Выберите допустимую дату{type === "datetime-local" ? " и время" : ""}.
        </span>
      )}
      {open && !disabled && (
        <span
          id={id}
          role="group"
          aria-label="Календарь выбора даты"
          className="block rounded-2xl border border-slate-200 bg-white p-3 mt-2 shadow-sm w-full max-w-sm"
        >
          <span className="flex items-center gap-1 mb-3">
            <button
              type="button"
              aria-label={
                type === "month" ? "Предыдущий год" : "Предыдущий месяц"
              }
              className="p-2 hover:bg-slate-100 rounded-full"
              onClick={() => move(type === "month" ? -12 : -1)}
            >
              <ChevronLeft size={16} />
            </button>
            <select
              aria-label="Месяц"
              className="min-w-0 flex-1 bg-slate-50 rounded-lg py-2 text-sm"
              value={month}
              onChange={(e) =>
                setCursor(`${year}-${e.target.value.padStart(2, "0")}`)
              }
            >
              {months.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              aria-label="Год"
              className="bg-slate-50 rounded-lg py-2 text-sm"
              value={year}
              onChange={(e) =>
                setCursor(`${e.target.value}-${String(month).padStart(2, "0")}`)
              }
            >
              {Array.from(
                {
                  length:
                    Math.max(new Date().getFullYear() + 20, year) -
                    Math.min(1900, year) +
                    1,
                },
                (_, i) => Math.min(1900, year) + i,
              ).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={
                type === "month" ? "Следующий год" : "Следующий месяц"
              }
              className="p-2 hover:bg-slate-100 rounded-full"
              onClick={() => move(type === "month" ? 12 : 1)}
            >
              <ChevronRight size={16} />
            </button>
          </span>
          {type === "month" ? (
            <span className="grid grid-cols-3 gap-1">
              {months.map((name, index) => {
                const date = `${year}-${String(index + 1).padStart(2, "0")}`;
                return (
                  <button
                    type="button"
                    key={name}
                    disabled={unavailable(date)}
                    aria-pressed={value === date}
                    className={`rounded-xl px-1 py-3 text-sm disabled:opacity-30 ${value === date ? "bg-brand text-white" : "hover:bg-brand-pale"}`}
                    onClick={() => choose(date)}
                  >
                    {name}
                  </button>
                );
              })}
            </span>
          ) : (
            <span className="grid grid-cols-7 gap-1">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
                <span
                  key={d}
                  className="text-center text-xs text-slate-400 py-1"
                >
                  {d}
                </span>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`empty-${i}`} />
              ))}
              {Array.from({ length: count }, (_, i) => {
                const date = `${cursor}-${String(i + 1).padStart(2, "0")}`;
                return (
                  <button
                    type="button"
                    key={date}
                    aria-label={new Date(date + "T12:00:00").toLocaleDateString(
                      "ru-RU",
                      { day: "numeric", month: "long", year: "numeric" },
                    )}
                    aria-pressed={dateValue === date}
                    disabled={unavailable(date)}
                    onClick={() => choose(date)}
                    className={`rounded-xl py-2 text-sm disabled:opacity-25 ${dateValue === date ? "bg-brand text-white" : date === localDate() ? "bg-brand-pale text-brand font-semibold" : "hover:bg-slate-100"}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </span>
          )}
          <span className="flex justify-between gap-3 text-sm text-brand border-t mt-3 pt-3">
            <button
              type="button"
              disabled={unavailable(
                type === "month" ? localDate().slice(0, 7) : localDate(),
              )}
              className="disabled:opacity-30"
              onClick={() =>
                choose(type === "month" ? localDate().slice(0, 7) : localDate())
              }
            >
              {type === "month" ? "Этот месяц" : "Сегодня"}
            </button>
            {!required && type !== "month" && (
              <button
                type="button"
                onClick={() => {
                  onValueChange("");
                  setOpen(false);
                  setInvalid(false);
                }}
              >
                Очистить
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              Закрыть
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
