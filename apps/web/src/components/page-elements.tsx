import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="subtle mt-2">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="py-10 text-center text-sm text-muted">{children}</div>;
}

export function AnalysisList({ title, items }: { title: string; items: unknown }) {
  const values = Array.isArray(items) ? items : [];
  if (!values.length) return null;

  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-muted">
        {values.map((value, index) => (
          <li key={`${String(value)}-${index}`}>· {String(value)}</li>
        ))}
      </ul>
    </div>
  );
}
