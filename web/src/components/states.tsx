import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { isApiError } from '@/api/errors';
import { Button } from './ui/button';
import { Icon, type IconName } from './ui/Icon';
import { Skeleton } from './ui/skeleton';

export function EmptyState({ icon = 'folder', title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-muted"><Icon name={icon} /></span>
      <h3 className="mt-4 text-[16px]">{title}</h3>
      {children ? <p className="mt-1.5 max-w-[46ch] text-[14px] leading-relaxed text-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Forbidden({ inline }: { inline?: boolean }) {
  return (
    <div className={inline ? 'py-10' : 'py-20'}>
      <p className="kicker">Erreur 403</p>
      <h1 className="mt-2 font-heading text-[clamp(28px,3.6vw,40px)] font-semibold tracking-[-0.035em]">Accès refusé</h1>
      <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted">
        Votre compte n’a pas les droits nécessaires sur cette ressource. Si vous pensez que c’est une erreur, demandez l’accès à l’équipe FRACT.
      </p>
      <Button asChild variant="quiet" className="mt-6"><Link to="/actifs">Revenir à mes actifs</Link></Button>
    </div>
  );
}

export function NotFoundBlock({ what = 'Cette page' }: { what?: string }) {
  return (
    <div className="py-20">
      <p className="kicker">Erreur 404</p>
      <h1 className="mt-2 font-heading text-[clamp(28px,3.6vw,40px)] font-semibold tracking-[-0.035em]">Introuvable</h1>
      <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted">{what} est introuvable : le lien est peut-être périmé ou incomplet.</p>
      <Button asChild variant="quiet" className="mt-6"><Link to="/actifs">Revenir à mes actifs</Link></Button>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (isApiError(error) && error.status === 403) return <Forbidden inline />;
  if (isApiError(error) && error.status === 423) {
    return <EmptyState icon="lock" title="Compte suspendu">Ce compte est suspendu. Aucune donnée ne peut être affichée.</EmptyState>;
  }
  const message = isApiError(error) ? error.message : 'Une erreur inattendue est survenue.';
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-bad-soft text-bad"><Icon name="alert" /></span>
      <h3 className="mt-4 text-[16px]">Impossible de charger ces données</h3>
      <p className="mt-1.5 max-w-[46ch] text-[14px] text-muted">{message}</p>
      {onRetry ? (
        <Button variant="quiet" size="sm" className="mt-5" onClick={onRetry}>
          <Icon name="refresh" className="h-4 w-4" /> Réessayer
        </Button>
      ) : null}
    </div>
  );
}

export function Q<D>({ query, skeleton, empty, children }: {
  query: UseQueryResult<D>;
  skeleton?: ReactNode;
  empty?: (d: D) => ReactNode | false;
  children: (d: D) => ReactNode;
}) {
  if (query.isPending) return <>{skeleton ?? <SkeletonBlock />}</>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const e = empty?.(query.data);
  if (e) return <>{e}</>;
  return <>{children(query.data)}</>;
}

export function SkeletonBlock({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-2" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={i === 0 ? 'h-6 w-1/3' : 'h-10'} />)}
    </div>
  );
}

export function SkeletonCards({ n = 4 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="rounded-card border border-line p-5"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="mt-4 h-8 w-3/4" /><Skeleton className="mt-3 h-3 w-1/3" /></div>
      ))}
    </div>
  );
}
