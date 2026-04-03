'use client';

interface FooterLink {
  name: string;
  url: string;
}

interface FooterCardProps {
  groups: FooterLink[][];
}

export function FooterCard({ groups }: FooterCardProps) {
  return (
    <footer className="np-article np-card-footer np-footer">
      {groups.map((group, gi) => (
        <span key={gi}>
          {gi > 0 && <span className="np-footer-sep">&middot;</span>}
          {group.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="np-footer-link"
            >
              {link.name}
            </a>
          ))}
        </span>
      ))}
    </footer>
  );
}
