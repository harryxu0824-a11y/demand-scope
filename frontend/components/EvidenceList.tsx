import type { Evidence } from "@/lib/types";

export function EvidenceList({ items }: { items: Evidence[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted">No surviving evidence.</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((e) => (
        <li
          key={e.evidence_id}
          className="rounded-md border border-border bg-bg/60 p-3"
        >
          <p className="text-sm leading-relaxed text-fg">“{e.quote}”</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>u/{e.author}</span>
            <span>·</span>
            <span>score {e.score}</span>
            <span>·</span>
            <a
              href={e.permalink}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              open on reddit ↗
            </a>
            <span className="ml-auto font-mono text-[10px] opacity-60">
              {e.evidence_id}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
