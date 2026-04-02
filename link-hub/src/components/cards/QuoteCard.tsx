'use client';

interface QuoteCardProps {
  quote: string;
  name: string;
  role: string;
  inline?: boolean;
}

export function QuoteCard({ quote, name, role, inline = false }: QuoteCardProps) {
  if (inline) {
    return (
      <blockquote className="np-inline-quote">
        &ldquo;{quote}&rdquo;
        <cite className="np-cite">&mdash; {name}, {role}</cite>
      </blockquote>
    );
  }

  return (
    <blockquote className="np-article np-card-quote np-citation">
      &ldquo;{quote}&rdquo;
      <cite className="np-cite">&mdash; {name}, {role}</cite>
    </blockquote>
  );
}
