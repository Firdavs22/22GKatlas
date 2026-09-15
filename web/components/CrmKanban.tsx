"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  ArrowRight,
  Baby,
  CalendarClock,
  GripVertical,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { leadContact, type IntakeDetails } from "./TildaSubmission";

export type KanbanStage = {
  id: string;
  title: string;
  kind: string;
  position: number;
};
export type KanbanLead = {
  id: string;
  parentName: string;
  phone: string;
  childName: string;
  direction: string;
  priority: string;
  source: string;
  ownerId: string | null;
  nextAction: string;
  nextActionAt: string | null;
  stageId: string;
  state: string;
  revision: number;
  intakeDetails?: IntakeDetails | null;
};
type Owner = { id: string; name: string };
const palette = ["#648ec7", "#7e85c8", "#a17fb4", "#ca9a63", "#5b9d90"];
const stageColor = (stage: KanbanStage, index: number) =>
  stage.kind === "lost"
    ? "#b58891"
    : stage.kind === "deferred"
      ? "#c7a061"
      : palette[index % palette.length];
const dueDate = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

const keyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context },
) => {
  if (!["ArrowRight", "ArrowLeft"].includes(event.code)) return;
  event.preventDefault();
  const activeRect = context.collisionRect;
  if (!activeRect) return;
  const currentCenter = activeRect.left + activeRect.width / 2;
  const direction = event.code === "ArrowRight" ? 1 : -1;
  const options = context.droppableContainers
    .getEnabled()
    .map((container) => ({
      container,
      rect: context.droppableRects.get(container.id),
    }))
    .filter(
      (item) =>
        item.rect &&
        direction * (item.rect.left + item.rect.width / 2 - currentCenter) > 20,
    )
    .sort(
      (a, b) =>
        Math.abs(a.rect!.left + a.rect!.width / 2 - currentCenter) -
        Math.abs(b.rect!.left + b.rect!.width / 2 - currentCenter),
    );
  const target = options[0];
  if (!target?.rect) return;
  return {
    x:
      currentCoordinates.x +
      target.rect.left +
      target.rect.width / 2 -
      currentCenter,
    y: currentCoordinates.y,
  };
};

function CardBody({ lead, owner }: { lead: KanbanLead; owner?: Owner }) {
  const overdue =
    !!lead.nextActionAt && new Date(lead.nextActionAt) < new Date();
  return (
    <>
      <div className="flex items-center gap-2 mb-3 text-[10px] font-semibold tracking-wide uppercase">
        <span className="text-slate-400 truncate">
          {lead.source || "Заявка"}
        </span>
        {lead.priority === "high" && (
          <span className="rounded-full bg-rose-50 text-rose-600 px-2 py-0.5 shrink-0">
            Приоритет
          </span>
        )}
      </div>
      <p className="font-semibold text-[15px] text-slate-800 leading-snug pr-4 break-words">
        {lead.parentName}
      </p>
      <p className="flex items-start gap-1.5 text-xs text-slate-500 mt-2">
        <MessageCircle size={13} className="shrink-0 mt-0.5" />
        <span className="break-words min-w-0">
          {leadContact(lead) || "Контакт нужно уточнить"}
        </span>
      </p>
      <div className="mt-4 flex items-start gap-2">
        <Baby size={15} className="text-slate-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-slate-700 break-words">
            {lead.childName || "Ребенок"}
            {!lead.childName && lead.intakeDetails?.childAge
              ? ` · ${lead.intakeDetails.childAge}`
              : ""}
          </p>
          {lead.direction && (
            <p className="text-xs text-slate-400 mt-0.5 break-words">
              {lead.direction}
            </p>
          )}
        </div>
      </div>
      <div
        className={`mt-4 rounded-xl p-2.5 text-xs ${overdue ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-500"}`}
      >
        <p className="flex items-start gap-1.5">
          <CalendarClock size={13} className="shrink-0 mt-0.5" />
          <span>{lead.nextAction || "Запланировать контакт"}</span>
        </p>
        {lead.nextActionAt && (
          <p className="mt-1.5 pl-5 font-medium">
            {overdue ? "Просрочено · " : ""}
            {dueDate(lead.nextActionAt)}
          </p>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] font-semibold">
          {owner ? initials(owner.name) : <UserRound size={12} />}
        </span>
        <span className="text-[11px] text-slate-500 truncate">
          {owner?.name || "Назначить ответственного"}
        </span>
      </div>
    </>
  );
}

function DraggableCard({
  lead,
  owner,
  stages,
  disabled,
  onOpen,
  onMove,
}: {
  lead: KanbanLead;
  owner?: Owner;
  stages: KanbanStage[];
  disabled: boolean;
  onOpen: (id: string) => void;
  onMove: (lead: KanbanLead, stageId: string) => Promise<boolean>;
}) {
  const { setNodeRef, attributes, listeners, isDragging, setActivatorNodeRef } =
    useDraggable({ id: lead.id, disabled });
  return (
    <article
      ref={setNodeRef}
      data-lead-id={lead.id}
      className={`relative rounded-2xl border bg-white transition-[box-shadow,border-color,opacity] duration-200 motion-reduce:transition-none ${isDragging ? "opacity-20 border-dashed border-brand" : "border-slate-200/80 shadow-[0_2px_8px_-5px_rgba(15,23,42,0.25)] hover:shadow-md hover:border-slate-300"}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        aria-label={`Перенести заявку ${lead.parentName}`}
        disabled={disabled}
        className="absolute right-2 top-2 p-2 rounded-lg text-slate-300 hover:text-brand hover:bg-slate-50 cursor-grab active:cursor-grabbing touch-none disabled:opacity-30"
      >
        <GripVertical size={16} />
      </button>
      <button
        type="button"
        onClick={() => onOpen(lead.id)}
        className="block w-full text-left px-4 pt-4 pb-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <CardBody lead={lead} owner={owner} />
      </button>
      <div className="px-4 pb-3 flex items-center gap-1.5 text-slate-400">
        <ArrowRight size={12} />
        <select
          aria-label={`Этап заявки ${lead.parentName}`}
          value={lead.stageId}
          disabled={disabled}
          onChange={(e) => {
            void onMove(lead, e.target.value);
          }}
          className="min-w-0 w-full text-[11px] bg-transparent focus:outline-none focus:ring-1 focus:ring-brand rounded py-1 text-slate-500 cursor-pointer"
        >
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.title}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

function Column({
  stage,
  index,
  leads,
  owners,
  stages,
  disabled,
  onOpen,
  onMove,
}: {
  stage: KanbanStage;
  index: number;
  leads: KanbanLead[];
  owners: Owner[];
  stages: KanbanStage[];
  disabled: boolean;
  onOpen: (id: string) => void;
  onMove: (lead: KanbanLead, stageId: string) => Promise<boolean>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage:${stage.id}`,
    data: { stageId: stage.id },
    disabled,
  });
  return (
    <section
      ref={setNodeRef}
      aria-label={stage.title}
      className={`w-[296px] shrink-0 rounded-2xl border transition-colors duration-200 motion-reduce:transition-none ${isOver ? "bg-blue-50/80 border-blue-300" : "bg-[#f5f7fa] border-slate-200/60"}`}
    >
      <div className="px-4 pt-4 pb-3">
        <div
          className="h-1 rounded-full mb-3 opacity-80"
          style={{ backgroundColor: stageColor(stage, index) }}
        />
        <h2 className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
          <span>{stage.title}</span>
          <span className="bg-white text-slate-500 border border-slate-200/70 rounded-md min-w-6 px-1.5 py-0.5 text-center text-xs">
            {leads.length}
          </span>
        </h2>
      </div>
      <div className="px-2.5 pb-3 space-y-3 min-h-[360px]">
        {leads.map((lead) => (
          <DraggableCard
            key={lead.id}
            lead={lead}
            stages={stages}
            owner={owners.find((o) => o.id === lead.ownerId)}
            disabled={disabled}
            onOpen={onOpen}
            onMove={onMove}
          />
        ))}
        {!leads.length && (
          <div
            className={`rounded-xl border border-dashed p-7 text-center text-xs ${isOver ? "border-blue-300 text-blue-600 bg-white/60" : "border-slate-200 text-slate-400"}`}
          >
            {isOver
              ? "Отпустите карточку здесь"
              : "Здесь появятся заявки этого этапа"}
          </div>
        )}
      </div>
    </section>
  );
}

export default function CrmKanban({
  stages,
  leads,
  owners,
  disabled,
  onOpen,
  onMove,
}: {
  stages: KanbanStage[];
  leads: KanbanLead[];
  owners: Owner[];
  disabled: boolean;
  onOpen: (id: string) => void;
  onMove: (lead: KanbanLead, stageId: string) => Promise<boolean>;
}) {
  const [active, setActive] = useState<KanbanLead | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const board = useRef<HTMLDivElement>(null);
  const previousRects = useRef(new Map<string, { x: number; y: number }>());
  const droppedId = useRef<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );
  const id = useId();
  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(media.matches);
    const listener = () => setReduceMotion(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  useLayoutEffect(() => {
    const nextRects = new Map<string, { x: number; y: number }>();
    const boardRect = board.current?.getBoundingClientRect();
    board.current
      ?.querySelectorAll<HTMLElement>("[data-lead-id]")
      .forEach((node) => {
        const key = node.dataset.leadId!;
        const box = node.getBoundingClientRect();
        const rect = {
          x:
            box.left -
            (boardRect?.left || 0) +
            (board.current?.scrollLeft || 0),
          y: box.top - (boardRect?.top || 0) + (board.current?.scrollTop || 0),
        };
        const previous = previousRects.current.get(key);
        if (
          previous &&
          key !== droppedId.current &&
          !reduceMotion &&
          !active &&
          (previous.x !== rect.x || previous.y !== rect.y)
        ) {
          node.animate(
            [
              {
                transform: `translate(${previous.x - rect.x}px, ${previous.y - rect.y}px)`,
              },
              { transform: "translate(0, 0)" },
            ],
            { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" },
          );
        }
        nextRects.set(key, rect);
      });
    previousRects.current = nextRects;
    if (!active) droppedId.current = null;
  }, [leads, active, reduceMotion]);
  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={(args) => {
        return args.pointerCoordinates
          ? pointerWithin(args)
          : rectIntersection(args);
      }}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Для переноса нажмите пробел. Стрелки влево и вправо выбирают этап. Пробел завершает перенос, Escape отменяет.",
        },
        announcements: {
          onDragStart: ({ active: item }) =>
            `Перенос заявки ${leads.find((l) => l.id === item.id)?.parentName || ""}`,
          onDragOver: ({ over }) =>
            over
              ? `Этап ${stages.find((s) => `stage:${s.id}` === over.id)?.title || ""}`
              : "Вне этапов",
          onDragEnd: ({ over }) =>
            over ? "Перенос отправлен на сохранение" : "Перенос отменен",
          onDragCancel: () => "Перенос отменен",
        },
      }}
      onDragStart={({ active: item }) =>
        setActive(leads.find((l) => l.id === item.id) || null)
      }
      onDragCancel={() => setActive(null)}
      onDragEnd={({ over }) => {
        const lead = active;
        droppedId.current = lead?.id || null;
        setActive(null);
        if (lead && over?.data.current?.stageId && !disabled)
          void onMove(lead, over.data.current.stageId);
      }}
    >
      <p className="text-xs text-slate-400 mb-3">
        Перенесите карточку за значок ⋮⋮ или выберите этап внизу карточки.
      </p>
      <div
        ref={board}
        className="flex items-stretch gap-4 overflow-x-auto overscroll-x-contain pb-6 pt-1"
      >
        {stages.map((stage, index) => (
          <Column
            key={stage.id}
            stage={stage}
            index={index}
            leads={leads.filter((lead) => lead.stageId === stage.id)}
            owners={owners}
            stages={stages}
            disabled={disabled}
            onOpen={onOpen}
            onMove={onMove}
          />
        ))}
      </div>
      <DragOverlay
        dropAnimation={
          reduceMotion
            ? null
            : { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" }
        }
        zIndex={60}
      >
        {active ? (
          <div
            className="rounded-2xl border border-brand/30 bg-white p-4 shadow-2xl ring-4 ring-brand/5 cursor-grabbing"
            style={{ transform: reduceMotion ? undefined : "rotate(1.5deg)" }}
          >
            <CardBody
              lead={active}
              owner={owners.find((o) => o.id === active.ownerId)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
