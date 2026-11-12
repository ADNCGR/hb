import type { ReactNode } from 'react';
import type * as T from '@/api/types';
import { dateHeure, STATUT_DEMANDE, STATUT_ECRITURE, STATUT_OPERATION, STATUT_RAPPORT } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge, type BadgeTone } from './ui/badge';
import { Button } from './ui/button';
import { Icon } from './ui/Icon';

export function PageHeader({ title, sub, donneesAu, actions }: { title: ReactNode; sub?: ReactNode; donneesAu?: number | string | null; actions?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-line pb-5">
      <div className="min-w-0">
        <h1 className="font-heading text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.03em]">{title}</h1>
        <p className="mt-1 text-[14px] text-muted">
          {sub}
          {donneesAu ? <span className={sub ? 'ml-3 border-l border-line pl-3' : undefined}>Données au {dateHeure(new Date(donneesAu))}</span> : null}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Stat({ label, value, foot, badge, tone }: { label: string; value: ReactNode; foot?: ReactNode; badge?: ReactNode; tone?: 'ok' | 'bad' }) {
  return (
    <div className="rounded-card border border-line bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="kicker">{label}</p>
        {badge}
      </div>
      <p className={cn('tnum mt-2.5 font-heading text-[clamp(24px,2.2vw,30px)] font-semibold leading-tight tracking-[-0.03em]', tone === 'ok' && 'text-ok', tone === 'bad' && 'text-bad')}>{value}</p>
      {foot ? <p className="mt-1.5 text-[13px] leading-snug text-muted">{foot}</p> : null}
    </div>
  );
}

export function Section({ title, sub, action, children, className }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-card border border-line bg-white', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-5 pt-5">
        <div className="min-w-0">
          <h2 className="text-[16.5px]">{title}</h2>
          {sub ? <p className="mt-0.5 text-[13.5px] text-muted">{sub}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

const OP_TONE: Record<T.StatutOperation, BadgeTone> = { CONFIRMEE: 'ok', EN_ATTENTE: 'wait', ECHOUEE: 'bad' };
const ECR_TONE: Record<T.StatutEcriture, BadgeTone> = { CONTROLEE: 'ok', A_CONTROLER: 'wait', REJETEE: 'bad' };
const RAP_TONE: Record<T.StatutRapport, BadgeTone> = { BROUILLON: 'neutral', SOUMIS: 'wait', VALIDE: 'ink', PUBLIE: 'ok' };

export const OperationBadge = ({ s }: { s: T.StatutOperation }) => <Badge tone={OP_TONE[s]} dot>{STATUT_OPERATION[s]}</Badge>;
export const EcritureBadge = ({ s }: { s: T.StatutEcriture }) => <Badge tone={ECR_TONE[s]} dot>{STATUT_ECRITURE[s]}</Badge>;
export const RapportBadge = ({ s }: { s: T.StatutRapport }) => <Badge tone={RAP_TONE[s]} dot>{STATUT_RAPPORT[s]}</Badge>;
export const DemandeBadge = ({ s }: { s: T.StatutDemande }) => <Badge tone={s === 'OUVERTE' ? 'wait' : 'ok'} dot>{STATUT_DEMANDE[s]}</Badge>;

export function Pager({ page, pages, total, onPage, unit = 'lignes' }: { page: number; pages: number; total: number; onPage: (p: number) => void; unit?: string }) {
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13.5px] text-muted" aria-label="Pagination">
      <span>{total.toLocaleString('fr-FR')} {unit}, page {page} sur {pages}</span>
      <div className="flex gap-2">
        <Button variant="quiet" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><Icon name="chevronLeft" className="h-4 w-4" />Précédente</Button>
        <Button variant="quiet" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Suivante<Icon name="chevronRight" className="h-4 w-4" /></Button>
      </div>
    </nav>
  );
}

export function Notice({ tone = 'neutral', icon = 'info', children }: { tone?: 'neutral' | 'wait' | 'bad' | 'ok'; icon?: Parameters<typeof Icon>[0]['name']; children: ReactNode }) {
  const tones = { neutral: 'bg-surface text-ink', wait: 'bg-wait-soft text-wait', bad: 'bg-bad-soft text-bad', ok: 'bg-ok-soft text-ok' };
  return (
    <div className={cn('flex items-start gap-2.5 rounded-field px-3.5 py-3 text-[14px] leading-snug', tones[tone])}>
      <Icon name={icon} className="mt-px h-[18px] w-[18px]" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Facts({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
      {items.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="font-heading text-[13.5px] font-semibold">{k}</dt>
          <dd className="text-[14.5px] leading-relaxed text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
