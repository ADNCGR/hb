import { cn } from '@/lib/cn';

export function Chips<V extends string>({ value, onChange, options, label }: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-9 rounded-full px-3.5 text-[13.5px] transition-colors',
            value === o.value ? 'bg-ink text-white' : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] hover:bg-surface',
          )}
        >
          {o.label}
          {o.count !== undefined ? <b className="ml-1 font-semibold">{o.count}</b> : null}
        </button>
      ))}
    </div>
  );
}
