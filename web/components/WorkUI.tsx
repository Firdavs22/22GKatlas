"use client";
import { ReactNode } from "react";
export const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 bg-white text-sm disabled:bg-slate-100";
export const buttonClass =
  "rounded-full bg-brand text-white px-4 py-2 text-sm disabled:opacity-40";
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm text-slate-600 space-y-1">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Notice({ error }: { error: string }) {
  return error ? (
    <p
      role="alert"
      className="my-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800"
    >
      {error}
    </p>
  ) : null;
}
export function errorText(error: unknown): string {
  const message = (
    error as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data?.message;
  return Array.isArray(message)
    ? message.join(". ")
    : message || "Не удалось выполнить действие. Повторите попытку.";
}
export function localDate(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}
export async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
