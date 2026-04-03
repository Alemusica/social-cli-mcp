'use client';

import { NpHeadline } from '../shared/NpHeadline';

interface Credential {
  text: string;
  year: string;
  highlight?: boolean;
}

interface CredentialCardProps {
  title: string;
  meta?: string;
  items: Credential[];
}

export function CredentialCard({ title, meta, items }: CredentialCardProps) {
  return (
    <article className="np-article np-card-credential">
      <NpHeadline title={title} meta={meta} />
      <ul className="np-cred-list">
        {items.map((cred, i) => (
          <li key={i} className={`np-cred-item${cred.highlight ? ' np-cred-highlight' : ''}`}>
            <strong>{cred.text}</strong>
            <small>{cred.year}</small>
          </li>
        ))}
      </ul>
    </article>
  );
}
