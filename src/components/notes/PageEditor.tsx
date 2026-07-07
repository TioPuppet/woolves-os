'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  parseDoc,
  serializeDoc,
  newBlockId,
  BLOCK_MENU,
  type Note,
  type Block,
  type BlockType,
} from '@/lib/notes';

const ICONS = ['📝', '🎯', '🔥', '🐺', '💪', '📚', '💡', '⚡', '🧠', '📌', '✅', '🏆', '🌙', '💰', '🩺', '⭐'];

function blockClass(type: BlockType, checked?: boolean): string {
  if (type === 'h1') return 'text-2xl font-bold';
  if (type === 'h2') return 'text-lg font-semibold';
  if (type === 'todo' && checked) return 'text-base text-muted-foreground line-through';
  return 'text-base';
}

export function PageEditor({
  note,
  onBack,
  onSave,
  onDelete,
}: {
  note: Note;
  onBack: () => void;
  onSave: (content: string) => void;
  onDelete: () => void;
}) {
  const initial = useMemo(() => parseDoc(note.content), [note.id]);
  const [icon, setIcon] = useState(initial.icon);
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [slashFor, setSlashFor] = useState<string | null>(null);
  const [iconOpen, setIconOpen] = useState(false);

  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const pendingFocus = useRef<string | null>(null);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  // Autosave (debounced) whenever the document changes.
  useEffect(() => {
    const t = setTimeout(() => saveRef.current(serializeDoc({ icon, blocks })), 600);
    return () => clearTimeout(t);
  }, [icon, blocks]);

  // Focus a freshly created / merged block after render.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const el = refs.current[id];
    if (el) {
      el.focus();
      const v = el.value;
      el.setSelectionRange(v.length, v.length);
    }
  }, [blocks]);

  const isEmpty = blocks.every((b) => !b.text.trim());

  const update = (id: string, patch: Partial<Block>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const grow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const onChange = (id: string, value: string) => {
    const shortcuts: Record<string, BlockType> = {
      '# ': 'h1',
      '## ': 'h2',
      '- ': 'bullet',
      '* ': 'bullet',
      '[] ': 'todo',
      '[ ] ': 'todo',
    };
    const sc = shortcuts[value];
    if (sc) {
      update(id, { type: sc, text: '', ...(sc === 'todo' ? { checked: false } : {}) });
      return;
    }
    if (value === '/') {
      setSlashFor(id);
      update(id, { text: '' });
      return;
    }
    update(id, { text: value });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) => {
    const idx = blocks.findIndex((x) => x.id === id);
    const b = blocks[idx];
    if (!b) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((b.type === 'todo' || b.type === 'bullet') && !b.text.trim()) {
        update(id, { type: 'text' });
        return;
      }
      const nb: Block = {
        id: newBlockId(),
        type: b.type === 'todo' || b.type === 'bullet' ? b.type : 'text',
        text: '',
        ...(b.type === 'todo' ? { checked: false } : {}),
      };
      setBlocks((bs) => {
        const copy = [...bs];
        copy.splice(idx + 1, 0, nb);
        return copy;
      });
      pendingFocus.current = nb.id;
      return;
    }

    if (e.key === 'Backspace' && b.text === '') {
      e.preventDefault();
      if (b.type !== 'text') {
        update(id, { type: 'text', checked: undefined });
        return;
      }
      if (idx > 0) {
        const prev = blocks[idx - 1];
        setBlocks((bs) => bs.filter((x) => x.id !== id));
        if (prev) pendingFocus.current = prev.id;
      }
      return;
    }

    if (e.key === 'Escape' && slashFor === id) setSlashFor(null);
  };

  const pickType = (id: string, type: BlockType) => {
    update(id, { type, text: '', ...(type === 'todo' ? { checked: false } : {}) });
    setSlashFor(null);
    pendingFocus.current = id;
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 pb-28 pt-10">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (isEmpty) onDelete();
            else onSave(serializeDoc({ icon, blocks }));
            onBack();
          }}
          className="press flex items-center gap-1 text-sm font-medium text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Espaço
        </button>
        <button
          type="button"
          onClick={() => {
            onDelete();
            onBack();
          }}
          aria-label="Excluir página"
          className="press text-muted-foreground hover:text-status-broken"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <div className="relative mb-3">
        <button
          type="button"
          onClick={() => setIconOpen((v) => !v)}
          className="press text-5xl leading-none"
          aria-label="Escolher ícone"
        >
          {icon}
        </button>
        {iconOpen && (
          <div className="anim-pop surface-1 absolute z-20 mt-2 grid grid-cols-8 gap-1 rounded-2xl p-2 shadow-lg ring-1 ring-border">
            {ICONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setIcon(e);
                  setIconOpen(false);
                }}
                className="press flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-card"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col">
        {blocks.map((b, i) => (
          <div key={b.id} className="group relative flex items-start gap-2 py-0.5">
            {b.type === 'bullet' && (
              <span className="select-none pt-[0.55rem] text-lg leading-none text-muted-foreground">•</span>
            )}
            {b.type === 'todo' && (
              <button
                type="button"
                onClick={() => update(b.id, { checked: !b.checked })}
                aria-label={b.checked ? 'Desmarcar' : 'Marcar'}
                className="press mt-[0.45rem] flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border"
                style={{
                  borderColor: b.checked ? 'hsl(var(--status-perfect))' : 'hsl(var(--border))',
                  backgroundColor: b.checked ? 'hsl(var(--status-perfect))' : 'transparent',
                  height: '1.1rem',
                  width: '1.1rem',
                }}
              >
                {b.checked && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12l5 5L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}
            <textarea
              ref={(el) => {
                refs.current[b.id] = el;
                grow(el);
              }}
              value={b.text}
              rows={1}
              onInput={(e) => grow(e.currentTarget)}
              onChange={(e) => onChange(b.id, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, b.id)}
              placeholder={i === 0 ? 'Título da página' : "Escreva ou digite '/'"}
              className={`w-full resize-none overflow-hidden bg-transparent leading-snug placeholder:text-muted-foreground/60 focus:outline-none ${blockClass(
                b.type,
                b.checked,
              )}`}
            />
            {slashFor === b.id && (
              <div className="anim-pop surface-1 absolute left-0 top-9 z-30 w-60 rounded-2xl p-1.5 shadow-lg ring-1 ring-border">
                {BLOCK_MENU.map((m) => (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => pickType(b.id, m.type)}
                    className="press flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-card"
                  >
                    <span className="text-sm font-medium">{m.label}</span>
                    <span className="text-xs text-muted-foreground">{m.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          const nb: Block = { id: newBlockId(), type: 'text', text: '' };
          setBlocks((bs) => [...bs, nb]);
          pendingFocus.current = nb.id;
        }}
        className="press mt-2 self-start text-sm text-muted-foreground/70"
      >
        + Adicionar bloco
      </button>
    </main>
  );
}
