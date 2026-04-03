'use client';

interface NpBarItem {
  label: string;
  value?: string;
}

interface NpBarProps {
  items: NpBarItem[];
}

export function NpBar({ items }: NpBarProps) {
  return (
    <div className="np-bar">
      {items.map((item, i) => (
        <span key={i} className="np-bar-item">
          {item.value ? (
            <>
              <span className="np-bar-label">{item.label}</span>
              <span className="np-bar-value">{item.value}</span>
            </>
          ) : (
            item.label
          )}
        </span>
      ))}
    </div>
  );
}
