'use client';
import { useState } from 'react';
import { X, Copy, Check, Send, Mail, UserCheck } from 'lucide-react';
import { Card, Button, SectionLabel } from '@/components/ui';
import { buildInviteUrl, telegramShareUrl, MAX_OPEN_URL } from '@/lib/invite';

interface Invite {
  parentId: string;
  name: string;
  email: string;
  inviteToken: string;
}

interface ChildCreatedModalProps {
  childName: string;
  invites: Invite[];
  /** True if SMTP is configured server-side — shown as a hint. */
  emailSent?: boolean;
  onClose: () => void;
}

function buildMessage(parentName: string, childName: string): string {
  return `Здравствуйте, ${parentName}! Сад «ГлобоАтлас» приглашает вас в личный кабинет. Создан кабинет для ${childName}. Откройте ссылку чтобы создать пароль:`;
}

export default function ChildCreatedModal({ childName, invites, emailSent = true, onClose }: ChildCreatedModalProps) {
  return (
    <div
      className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-3xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-full bg-success/20 text-emerald-700 flex items-center justify-center">
              <UserCheck size={22} />
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-foreground">
              <X size={20} />
            </button>
          </div>
          <SectionLabel>Карточка создана</SectionLabel>
          <h3 className="font-serif text-2xl mt-1">{childName}</h3>
          <p className="text-sm text-slate-600 mt-2">
            {invites.length === 0 ? (
              <>Новых родителей не создано — все уже есть в системе.</>
            ) : emailSent ? (
              <>
                <Mail size={12} className="inline -mt-0.5" />{' '}
                Письма с приглашением {invites.length === 1 ? 'отправлено' : 'отправлены'} —
                родител{invites.length === 1 ? 'ю' : 'ям'} на email.
                Если что-то не дойдёт — вот резервные ссылки:
              </>
            ) : (
              <>
                SMTP не настроен — письма не ушли. Передайте ссылки родителям вручную через
                Telegram или MAX:
              </>
            )}
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {invites.map(inv => (
            <InviteCard key={inv.parentId} invite={inv} childName={childName} />
          ))}
        </div>

        <div className="p-5 border-t border-slate-100">
          <Button variant="primary" onClick={onClose} className="w-full">
            Готово
          </Button>
        </div>
      </div>
    </div>
  );
}

function InviteCard({ invite, childName }: { invite: Invite; childName: string }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = buildInviteUrl(invite.inviteToken);
  const message = buildMessage(invite.name, childName);
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
    <Card padding="md">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="font-medium text-sm">{invite.name}</div>
          <div className="text-xs text-slate-500">{invite.email}</div>
        </div>
      </div>
      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs font-mono text-slate-700 break-all mb-3">
        {inviteUrl}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={copy}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full border border-slate-200 text-sm text-slate-700 hover:border-brand hover:text-brand transition-colors"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Готово' : 'Копировать'}
        </button>
        <a
          href={telegramShareUrl(inviteUrl, message)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full bg-brand text-white text-sm hover:bg-brand-soft transition-colors"
        >
          <Send size={14} />
          Telegram
        </a>
        <a
          href={MAX_OPEN_URL}
          target="_blank"
          rel="noreferrer"
          onClick={copy}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full border border-slate-200 text-sm text-slate-700 hover:border-brand hover:text-brand transition-colors"
          title="Откроется MAX; ссылка уже скопирована — вставьте в чат"
        >
          MAX
        </a>
      </div>
    </Card>
  );
}
