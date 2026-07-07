'use client';

import { useEffect, useState } from 'react';

const toCents = (v: number | null) => (v == null ? 0 : Math.round(v * 100));

/**
 * Campo de moeda estilo caixa eletrônico: você digita apenas dígitos e ele
 * formata automaticamente como R$ 0,00 (ex.: "50000" → R$ 500,00).
 * `value` em reais (number | null); `onValueChange` devolve reais (ou null).
 */
export function CurrencyInput({
  value,
  onValueChange,
  onBlur,
  placeholder = 'R$ 0,00',
  className,
  autoFocus,
}: {
  value: number | null;
  onValueChange: (n: number | null) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [cents, setCents] = useState<number>(() => toCents(value));

  // Sincroniza quando o valor externo muda (ex.: reset após registrar).
  useEffect(() => {
    setCents(toCents(value));
  }, [value]);

  const display =
    cents > 0
      ? (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '';

  return (
    <input
      inputMode="numeric"
      value={display}
      onBlur={onBlur}
      autoFocus={autoFocus}
      placeholder={placeholder}
      className={className}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        const c = digits ? parseInt(digits, 10) : 0;
        setCents(c);
        onValueChange(c > 0 ? c / 100 : null);
      }}
    />
  );
}
