'use client';

import { useEffect, useRef, useState } from 'react';

/** Animated number that eases from its previous value to the new one. */
export function CountUp({
  value,
  duration = 700,
  format,
}: {
  value: number;
  duration?: number;
  format: (n: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const startVal = from.current;
    if (startVal === value) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(startVal + (value - startVal) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format(display)}</>;
}
