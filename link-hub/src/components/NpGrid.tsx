'use client';

import { ReactNode } from 'react';

interface NpGridProps {
  children: ReactNode;
  cols?: 2 | 3;
}

export function NpGrid({ children, cols }: NpGridProps) {
  const cls = cols === 2 ? 'np-zone np-zone-2' : 'np-zone';
  return <div className={cls}>{children}</div>;
}
