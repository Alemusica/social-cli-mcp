'use client';

import { ReactNode } from 'react';

interface NpGridProps {
  children: ReactNode;
}

export function NpGrid({ children }: NpGridProps) {
  return <div className="np-zone">{children}</div>;
}
