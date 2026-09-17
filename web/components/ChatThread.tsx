"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, X, Paperclip } from "lucide-react";
import { io, Socket } from "socket.io-client";
import PageLayout from "@/components/PageLayout";
import { Card } from "@/components/ui";
import api, { refreshSession } from "@/lib/api";
import { WS_URL } from "@/lib/network";
import { ChatMessage } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import FileUpload from "@/components/FileUpload";
import AuthMedia from "@/components/AuthMedia";
import Lightbox from "@/components/Lightbox";
import { getMediaType } from "@/lib/media";
import { Notice, errorText } from "@/components/WorkUI";

interface ChatThreadProps {
  /** Path to the list page (e.g. /parent/chats) used for the back button. Ignored when `embedded` is true. */
  backHref?: string;
  /** Optional eyebrow label, defaults to a generic one. */
  eyebrow?: string;
  /** Allow staff users to send file attachments. */
  allowAttachments?: boolean;
  /** When true, renders without PageLayout/Card wrapper — designed to live inside ChatsLayout. */
  embedded?: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export default function ChatThread({
  backHref,
  eyebrow = "Диалог",
  allowAttachments = false,
  embedded = false,
}: ChatThreadProps) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef(id);
  activeIdRef.current = id;

  useEffect(() => {
    let active = true,
      pending = false;
    setMessages([]);
    setText("");
    setAttachments([]);
    setError("");
    setLoadError("");
    setSending(false);
    setLoading(true);
    const merge = (incoming: ChatMessage[]) =>
      setMessages((previous) => {
        const combined = new Map(
          [...previous, ...incoming].map((message) => [message.id, message]),
        );
        if (combined.size === previous.length) return previous;
        return [...combined.values()].sort(
          (a, b) =>
            a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
        );
      });
    const load = async () => {
      if (pending || !active || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const r = await api.get(`/chats/${id}/messages`);
        if (active) {
          merge(r.data);
          setLoadError("");
        }
      } catch (e) {
        if (active) setLoadError(errorText(e));
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    };
    void load();
    const socket = io(WS_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socket.on("connect", () => {
      socket.emit("joinRoom", id);
      void load();
    });
    socket.on("newMessage", (msg: ChatMessage) => {
      if (!active || msg.chatRoomId !== id) return;
      merge([msg]);
      window.dispatchEvent(new Event("chat:updated"));
    });
    socket.on("error", (err) => console.warn("[chat] socket error:", err));
    socket.on("connect_error", (err) =>
      console.warn("[chat] connect_error:", err.message),
    );
    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        refreshSession()
          .then(() => {
            if (socketRef.current === socket) socket.connect();
          })
          .catch(() => {});
      }
    });
    socketRef.current = socket;
    const timer = setInterval(() => {
      void load();
    }, 10000);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
      socketRef.current = null;
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    const list = messagesRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || (!text.trim() && attachments.length === 0)) return;
    const chatId = id;
    setSending(true);
    setError("");
    const payload: Record<string, unknown> = { text };
    if (allowAttachments) payload.attachments = attachments;
    try {
      const { data } = await api.post(`/chats/${id}/messages`, payload);
      if (activeIdRef.current !== chatId) return;
      setText("");
      setAttachments([]);
      // Optimistic insert; WS echo will be deduped by id
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data],
      );
      window.dispatchEvent(new Event("chat:updated"));
    } catch (err) {
      if (activeIdRef.current === chatId)
        setError(errorText(err) + " Текст и вложения сохранены в поле ввода.");
    } finally {
      if (activeIdRef.current === chatId) setSending(false);
    }
  };

  const conversation = (
    <div
      className={`flex flex-col min-h-0 ${embedded ? "h-full" : "h-[calc(100vh-220px)] min-h-[400px]"}`}
    >
      <div className="px-4">
        <Notice error={error || loadError} />
      </div>
      <div
        ref={messagesRef}
        className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-12">
            {loading ? "Загрузка сообщений…" : "Сообщений пока нет"}
          </div>
        ) : (
          messages.map((msg, i) => {
            const mine = msg.senderId === user?.id;
            const prev = messages[i - 1];
            const showDay = !prev || !sameDay(prev.createdAt, msg.createdAt);
            return (
              <div key={msg.id}>
                {showDay && (
                  <div className="text-center my-4">
                    <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
                      {dayLabel(msg.createdAt)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      mine
                        ? "bg-brand text-white rounded-br-md"
                        : "bg-slate-100 text-foreground rounded-bl-md"
                    }`}
                  >
                    {!mine && (
                      <div className="text-[11px] font-medium text-brand mb-0.5">
                        {msg.sender?.name}
                      </div>
                    )}
                    {msg.text && (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div
                        className={`${msg.text ? "mt-2" : ""} grid gap-1.5 ${msg.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
                      >
                        {msg.attachments.map((url, idx) => {
                          const isImage = getMediaType(url) === "image";
                          if (isImage) {
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => setLightboxUrl(url)}
                                className="block rounded-xl overflow-hidden bg-black/5 cursor-zoom-in"
                              >
                                <AuthMedia
                                  src={url}
                                  alt=""
                                  className="object-cover w-full h-40"
                                />
                              </button>
                            );
                          }
                          return (
                            <AuthMedia
                              key={idx}
                              src={url}
                              alt=""
                              className="rounded-xl object-cover w-full h-40 bg-black/5"
                            />
                          );
                        })}
                      </div>
                    )}
                    <div
                      className={`text-[10px] mt-1 ${
                        mine ? "text-white/70" : "text-slate-400"
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {allowAttachments && attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/40">
          <div className="flex gap-2 overflow-x-auto">
            {attachments.map((url, i) => (
              <div
                key={i}
                className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-brand-pale/30"
              >
                <AuthMedia
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  disabled={sending}
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={send}
        className="p-4 border-t border-slate-100 flex gap-2"
      >
        {allowAttachments && !sending && (
          <FileUpload
            onUpload={(urls) => setAttachments((p) => [...p, ...urls])}
            multiple
            label={
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 text-slate-500 hover:text-brand hover:border-brand transition-colors">
                <Paperclip size={16} />
              </span>
            }
          />
        )}
        <input
          disabled={sending}
          maxLength={10000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Напишите сообщение…"
          className="flex-1 h-10 px-4 text-sm rounded-full border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={sending || (!text.trim() && attachments.length === 0)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={14} />
          {sending ? "Отправка…" : "Отправить"}
        </button>
      </form>
      <Lightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );

  if (embedded) return conversation;

  return (
    <PageLayout
      eyebrow={eyebrow}
      title="Сообщения"
      actions={
        backHref ? (
          <button
            onClick={() => router.push(backHref)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand transition-colors"
          >
            <ArrowLeft size={16} />К списку
          </button>
        ) : undefined
      }
    >
      <Card padding="none" className="overflow-hidden">
        {conversation}
      </Card>
    </PageLayout>
  );
}
