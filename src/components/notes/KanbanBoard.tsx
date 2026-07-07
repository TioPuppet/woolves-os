'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useKanban } from '@/hooks/useKanban';
import {
  CARD_LABELS,
  DEFAULT_LISTS,
  dueState,
  labelColor,
  type Board,
  type KanbanCard,
  type KanbanList,
  type ChecklistItem,
} from '@/lib/kanban';

const cid = (id: number) => `C${id}`;
const lid = (id: number) => `L${id}`;
const parseId = (s: string) => Number(s.slice(1));

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

type Containers = Record<string, string[]>;

function buildContainers(lists: KanbanList[], cards: KanbanCard[]): Containers {
  const map: Containers = {};
  for (const l of lists) map[lid(l.id)] = [];
  const sorted = [...cards].sort((a, b) => a.position - b.position);
  for (const c of sorted) {
    if (c.list_id == null) continue;
    const k = lid(c.list_id);
    const arr = map[k];
    if (arr) arr.push(cid(c.id));
  }
  return map;
}

/* ---------------------------------------------------------------- Card UI */

function CardFace({ card, today }: { card: KanbanCard; today: string }) {
  const checked = card.checklist.filter((i) => i.done).length;
  const total = card.checklist.length;
  const ds = dueState(card.due_date, today);
  const dueTone =
    ds === 'overdue' ? '0 74% 56%' : ds === 'today' ? '46 96% 45%' : '145 45% 45%';
  return (
    <div className="flex flex-col gap-2">
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels.map((l) => (
            <span
              key={l}
              className="h-1.5 w-8 rounded-full"
              style={{ backgroundColor: `hsl(${labelColor(l)})` }}
            />
          ))}
        </div>
      )}
      <span className="text-sm leading-snug">{card.title}</span>
      {(card.due_date || total > 0 || card.description) && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {card.due_date && (
            <span
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5"
              style={{
                color: `hsl(${dueTone})`,
                backgroundColor: `hsl(${dueTone} / 0.14)`,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {card.due_date.slice(8, 10)}/{card.due_date.slice(5, 7)}
            </span>
          )}
          {total > 0 && (
            <span className="inline-flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {checked}/{total}
            </span>
          )}
          {card.description && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

function SortableCard({
  id,
  card,
  today,
  onOpen,
}: {
  id: string;
  card: KanbanCard;
  today: string;
  onOpen: (c: KanbanCard) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card)}
      className="surface-1 press cursor-grab touch-none rounded-xl p-3 active:cursor-grabbing"
    >
      <CardFace card={card} today={today} />
    </div>
  );
}

/* ------------------------------------------------------------------ Column */

function Column({
  list,
  cardIds,
  cardsById,
  today,
  onAddCard,
  onOpenCard,
  onRename,
  onDelete,
}: {
  list: KanbanList;
  cardIds: string[];
  cardsById: Map<number, KanbanCard>;
  today: string;
  onAddCard: (listId: number, title: string) => void;
  onOpenCard: (c: KanbanCard) => void;
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}) {
  const { setNodeRef } = useDroppable({ id: lid(list.id) });
  const [title, setTitle] = useState(list.title);
  const [adding, setAdding] = useState('');

  return (
    <div className="surface-2 flex max-h-[calc(100dvh-230px)] w-[82vw] max-w-[19rem] shrink-0 snap-start flex-col rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title.trim() !== list.title) onRename(list.id, title);
            else setTitle(list.title);
          }}
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-sm font-semibold focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">
          {cardIds.length}
        </span>
        <button
          type="button"
          onClick={() => onDelete(list.id)}
          aria-label="Excluir lista"
          className="press shrink-0 text-muted-foreground hover:text-status-broken"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div ref={setNodeRef} className="flex min-h-[8px] flex-1 flex-col gap-2 overflow-y-auto">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cardIds.map((c) => {
            const card = cardsById.get(parseId(c));
            if (!card) return null;
            return (
              <SortableCard key={c} id={c} card={card} today={today} onOpen={onOpenCard} />
            );
          })}
        </SortableContext>
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && adding.trim()) {
              onAddCard(list.id, adding);
              setAdding('');
            }
          }}
          placeholder="Adicionar cartão"
          className="min-h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          disabled={!adding.trim()}
          onClick={() => {
            onAddCard(list.id, adding);
            setAdding('');
          }}
          aria-label="Adicionar"
          className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- CardModal */

function CardModal({
  card,
  onClose,
  onSave,
  onDelete,
}: {
  card: KanbanCard;
  onClose: () => void;
  onSave: (patch: Partial<KanbanCard>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [due, setDue] = useState(card.due_date ?? '');
  const [labels, setLabels] = useState<string[]>(card.labels);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist);
  const [item, setItem] = useState('');

  const toggleLabel = (key: string) => {
    const next = labels.includes(key) ? labels.filter((l) => l !== key) : [...labels, key];
    setLabels(next);
    onSave({ labels: next });
  };
  const setChecklistAnd = (next: ChecklistItem[]) => {
    setChecklist(next);
    onSave({ checklist: next });
  };
  const addItem = () => {
    if (!item.trim()) return;
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
    setChecklistAnd([...checklist, { id, text: item.trim(), done: false }]);
    setItem('');
  };
  const done = checklist.filter((i) => i.done).length;
  const pct = checklist.length ? Math.round((done / checklist.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="anim-pop surface-1 flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-start gap-2">
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== card.title && onSave({ title: title.trim() })}
            rows={1}
            className="min-w-0 flex-1 resize-none bg-transparent text-lg font-semibold focus:outline-none"
          />
          <button type="button" onClick={onClose} aria-label="Fechar" className="press shrink-0 text-muted-foreground">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Etiquetas</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {CARD_LABELS.map((l) => {
            const on = labels.includes(l.key);
            return (
              <button
                key={l.key}
                type="button"
                onClick={() => toggleLabel(l.key)}
                className="press h-7 rounded-md px-3 text-xs font-medium"
                style={{
                  backgroundColor: `hsl(${l.color} / ${on ? 1 : 0.22})`,
                  color: on ? 'white' : `hsl(${l.color})`,
                }}
              >
                {l.label}
              </button>
            );
          })}
        </div>

        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Prazo</p>
        <input
          type="date"
          value={due}
          onChange={(e) => {
            setDue(e.target.value);
            onSave({ due_date: e.target.value || null });
          }}
          className="mb-4 min-h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Descrição</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== (card.description ?? '') && onSave({ description: description || null })}
          rows={3}
          placeholder="Adicione detalhes…"
          className="mb-4 w-full resize-none rounded-lg border border-border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Checklist</p>
          {checklist.length > 0 && <span className="text-xs text-muted-foreground">{pct}%</span>}
        </div>
        {checklist.length > 0 && (
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full bg-status-perfect transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
        <div className="mb-2 flex flex-col gap-1.5">
          {checklist.map((it) => (
            <div key={it.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setChecklistAnd(checklist.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
                }
                aria-label={it.done ? 'Desmarcar' : 'Marcar'}
                className="press flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
                style={{
                  borderColor: it.done ? 'hsl(var(--status-perfect))' : 'hsl(var(--border))',
                  backgroundColor: it.done ? 'hsl(var(--status-perfect))' : 'transparent',
                }}
              >
                {it.done && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12l5 5L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className={`min-w-0 flex-1 text-sm ${it.done ? 'text-muted-foreground line-through' : ''}`}>
                {it.text}
              </span>
              <button
                type="button"
                onClick={() => setChecklistAnd(checklist.filter((x) => x.id !== it.id))}
                aria-label="Remover"
                className="press shrink-0 text-muted-foreground hover:text-status-broken"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div className="mb-5 flex gap-2">
          <input
            value={item}
            onChange={(e) => setItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="Novo item"
            className="min-h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button type="button" onClick={addItem} disabled={!item.trim()} className="press rounded-lg bg-card px-3 text-sm font-medium disabled:opacity-40">
            Add
          </button>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="press flex min-h-10 items-center justify-center gap-2 rounded-xl border border-status-broken/40 text-sm font-medium text-status-broken"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Excluir cartão
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Board */

export function KanbanBoard({ userId, initial }: { userId: string; initial: Board }) {
  const {
    lists,
    cards,
    addList,
    renameList,
    deleteList,
    addCard,
    updateCard,
    deleteCard,
    savePositions,
  } = useKanban(userId, initial);

  const today = todayString();
  const cardsById = useMemo(() => {
    const m = new Map<number, KanbanCard>();
    for (const c of cards) m.set(c.id, c);
    return m;
  }, [cards]);

  const [containers, setContainersState] = useState<Containers>(() =>
    buildContainers(lists, cards),
  );
  const containersRef = useRef(containers);
  const setContainers = (next: Containers) => {
    containersRef.current = next;
    setContainersState(next);
  };
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState<KanbanCard | null>(null);
  const dragging = useRef(false);

  // Sync from server unless the user is mid-drag.
  const sig =
    lists.map((l) => l.id).join(',') +
    '|' +
    cards.map((c) => `${c.id}:${c.list_id}:${c.position}`).join(',');
  useEffect(() => {
    if (dragging.current) return;
    setContainers(buildContainers(lists, cards));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Seed default lists on first ever open.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || lists.length > 0) return;
    seeded.current = true;
    (async () => {
      for (const t of DEFAULT_LISTS) await addList.mutateAsync(t);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const findContainer = (id: string): string | undefined => {
    if (id.startsWith('L')) return id;
    return Object.keys(containersRef.current).find((k) =>
      (containersRef.current[k] ?? []).includes(id),
    );
  };

  const persist = (cont: Containers, keys: string[]) => {
    const updates: { id: number; list_id: number; position: number }[] = [];
    for (const k of [...new Set(keys)]) {
      const listId = parseId(k);
      (cont[k] ?? []).forEach((c, idx) =>
        updates.push({ id: parseId(c), list_id: listId, position: idx }),
      );
    }
    if (updates.length) savePositions.mutate(updates);
  };

  const onDragStart = (e: DragStartEvent) => {
    dragging.current = true;
    setActiveId(String(e.active.id));
  };

  const onDragOver = (e: DragOverEvent) => {
    const activeIdStr = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const from = findContainer(activeIdStr);
    const to = findContainer(overId);
    if (!from || !to || from === to) return;
    const cur = containersRef.current;
    const fromItems = cur[from] ?? [];
    const toItems = cur[to] ?? [];
    const overIndex = overId.startsWith('L') ? toItems.length : toItems.indexOf(overId);
    const insertAt = overIndex >= 0 ? overIndex : toItems.length;
    setContainers({
      ...cur,
      [from]: fromItems.filter((i) => i !== activeIdStr),
      [to]: [...toItems.slice(0, insertAt), activeIdStr, ...toItems.slice(insertAt)],
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const activeIdStr = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    dragging.current = false;
    setActiveId(null);
    if (!overId) return;
    const from = findContainer(activeIdStr);
    const to = findContainer(overId);
    if (!from || !to) return;
    let cur = containersRef.current;
    if (from === to) {
      const items = cur[from] ?? [];
      const oldIndex = items.indexOf(activeIdStr);
      const newIndex = overId.startsWith('L') ? items.length - 1 : items.indexOf(overId);
      if (oldIndex !== newIndex && newIndex >= 0) {
        cur = { ...cur, [from]: arrayMove(items, oldIndex, newIndex) };
        setContainers(cur);
      }
    }
    persist(cur, [from, to]);
  };

  const activeCard =
    activeId && !activeId.startsWith('L') ? cardsById.get(parseId(activeId)) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
          {lists.map((list) => (
            <Column
              key={list.id}
              list={list}
              cardIds={containers[lid(list.id)] ?? []}
              cardsById={cardsById}
              today={today}
              onAddCard={(listId, title) => addCard.mutate({ list_id: listId, title })}
              onOpenCard={(c) => setOpen(c)}
              onRename={(id, title) => renameList.mutate({ id, title })}
              onDelete={(id) => deleteList.mutate(id)}
            />
          ))}
          <AddList onAdd={(t) => addList.mutate(t)} />
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="surface-1 rounded-xl p-3 shadow-lg ring-1 ring-primary/40">
              <CardFace card={activeCard} today={today} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {open && (
        <CardModal
          card={cardsById.get(open.id) ?? open}
          onClose={() => setOpen(null)}
          onSave={(patch) => updateCard.mutate({ id: open.id, ...patch })}
          onDelete={() => {
            deleteCard.mutate(open.id);
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

function AddList({ onAdd }: { onAdd: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="press flex h-11 w-[60vw] max-w-[16rem] shrink-0 items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm font-medium text-muted-foreground"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        Adicionar lista
      </button>
    );
  }
  return (
    <div className="surface-2 flex w-[70vw] max-w-[17rem] shrink-0 gap-2 rounded-2xl p-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title.trim()) {
            onAdd(title);
            setTitle('');
            setEditing(false);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        onBlur={() => {
          if (title.trim()) onAdd(title);
          setTitle('');
          setEditing(false);
        }}
        placeholder="Nome da lista"
        className="min-h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  );
}
