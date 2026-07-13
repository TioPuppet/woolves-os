import { describe, expect, it } from 'vitest';
import { noteLinks, notePreview, noteTitle } from './notes';

describe('workspace note helpers', () => {
  it('extracts unique wiki links in writing order', () => {
    expect(noteLinks('Ver [[Treino]] e [[Finanças]]. Voltar a [[Treino]].')).toEqual(['Treino', 'Finanças']);
  });

  it('derives a readable title and preview', () => {
    const content = JSON.stringify({
      icon: '📝',
      blocks: [
        { id: 'a', type: 'h1', text: 'Plano da semana' },
        { id: 'b', type: 'text', text: 'Treinar cedo e revisar o caixa.' },
      ],
    });
    expect(noteTitle(content)).toBe('Plano da semana');
    expect(notePreview(content)).toBe('Treinar cedo e revisar o caixa.');
  });
});
