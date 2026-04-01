'use client';

import { ReactNode } from 'react';

interface NpLinkProps {
  href: string;
  children: ReactNode;
  external?: boolean;
  download?: boolean;
  variant?: 'press' | 'button';
}

export function NpLink({
  href,
  children,
  external = false,
  download = false,
  variant = 'press',
}: NpLinkProps) {
  const externalProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  const anchor = (
    <a
      href={href}
      className={variant === 'press' ? 'np-press-link' : undefined}
      download={download || undefined}
      {...externalProps}
    >
      {children}
    </a>
  );

  // .np-button targets the <a> inside a wrapper div (per globals.css: .np-button a {})
  if (variant === 'button') {
    return <div className="np-button">{anchor}</div>;
  }

  return anchor;
}
