'use client';

interface NpQuoteProps {
  quote: string;
  name: string;
  role: string;
  inline?: boolean;
}

export function NpQuote({ quote, name, role, inline = false }: NpQuoteProps) {
  if (inline) {
    return (
      <blockquote className="np-inline-quote">
        &ldquo;{quote}&rdquo;
        <cite className="np-cite">— {name}, {role}</cite>
      </blockquote>
    );
  }

  return (
    <blockquote className="np-citation">
      &ldquo;{quote}&rdquo;
      <cite className="np-cite">— {name}, {role}</cite>
    </blockquote>
  );
}
