'use client';
import { useEffect, useState } from 'react';
import { X, Copy, Check, Send } from 'lucide-react';
import { Button, SectionLabel } from '@/components/ui';
import { buildInviteUrl, telegramShareUrl, MAX_OPEN_URL } from '@/lib/invite';

interface InviteShareModalProps {
  /** Display name of the parent (used in default message). */
  parentName?: string;
  /** Display name of the child (used in default message). */
  childName?: string;
  /** Invite JWT returned by the backend. */
  token: string;
  /** Closes the modal. */
  onClose: () => void;
}

function buildMessage(parentName?: string, childName?: string): string {
  const greeting = parentName ? `Здравствуйте, ${parentName}!` : 'Здравствуйте!';
  const childPart = childName ? ` Создан личный кабинет для ${childName}.` : '';
  return `${greeting} Сад «ГлобоАтлас» приглашает вас в личный кабинет.${childPart} Откройте ссылку чтобы создать пароль:`;
}

export default function InviteShareModal({
  parentName,
  childName,
  token,
  onClose,
}: InviteShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  useEffect(() => {
    setInviteUrl(buildInviteUrl(token));
  }, [token]);

  const message = buildMessage(parentName, childName);
  const fullText = `${message}\n${inviteUrl}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-3xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <SectionLabel>Приглашение готово</SectionLabel>
            <h3 className="font-serif text-2xl mt-1">Отправьте родителю</h3>
            {(parentName || childName) && (
              <div className="text-sm text-slate-500 mt-1">
                {parentName}
                {parentName && childName ? ' · ' : ''}
                {childName}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <SectionLabel>Ссылка для родителя</SectionLabel>
            <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-mono text-slate-700 break-all">
              {inviteUrl}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Действует 30 дней. На этой странице родитель создаст пароль и войдёт в личный кабинет.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button variant="outline" onClick={copy} className="w-full">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Скопировано' : 'Скопировать'}
            </Button>
            <a
              href={telegramShareUrl(inviteUrl, message)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-soft transition-colors"
            >
              <Send size={16} />
              Telegram
            </a>
            <a
              href={MAX_OPEN_URL}
              target="_blank"
              rel="noreferrer"
              onClick={copy}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-slate-200 text-slate-700 text-sm font-medium hover:border-brand hover:text-brand transition-colors"
              title="Откроется MAX; ссылка уже скопирована — вставьте в чат"
            >
              MAX
            </a>
          </div>

          <details className="text-sm text-slate-600">
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-foreground">
              Шаблон сообщения
            </summary>
            <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-100 whitespace-pre-wrap leading-relaxed">
              {fullText}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
