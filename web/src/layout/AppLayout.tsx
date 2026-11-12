import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useActif, useActifs } from '@/api/hooks';
import { isApiError } from '@/api/errors';
import { useAuth, useRoles } from '@/auth/AuthContext';
import { ErrorState, Forbidden, NotFoundBlock, SkeletonBlock } from '@/components/states';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { ROLE } from '@/lib/format';

const NAV: { to: string; label: string; icon: IconName; group?: string }[] = [
  { to: '', label: 'Tableau de bord', icon: 'grid' },
  { to: 'levee', label: 'Levée et offre', icon: 'layers', group: 'Levée' },
  { to: 'investisseurs', label: 'Investisseurs', icon: 'users' },
  { to: 'registre', label: 'Registre des parts', icon: 'ledger' },
  { to: 'ventes', label: 'Ventes et caisses', icon: 'card', group: 'Activité' },
  { to: 'charges', label: 'Charges', icon: 'receipt' },
  { to: 'documents', label: 'Documents', icon: 'folder' },
  { to: 'rapports', label: 'Rapports', icon: 'file', group: 'Investisseurs' },
  { to: 'distributions', label: 'Distributions', icon: 'pie' },
  { to: 'acces', label: 'Accès', icon: 'key', group: 'Contrôle' },
  { to: 'journal', label: 'Journal', icon: 'history' },
];

export function Logo({ className }: { className?: string }) {
  return <span className={cn('font-heading text-[22px] font-bold tracking-[-0.04em]', className)}>FRACT<span className="text-muted-2">.</span></span>;
}

function ActifPicker({ actifId }: { actifId?: string }) {
  const q = useActifs();
  const navigate = useNavigate();
  const loc = useLocation();
  const section = actifId ? loc.pathname.split('/')[3] ?? '' : '';
  return (
    <div>
      <label htmlFor="actif-picker" className="mb-1.5 block font-heading text-[12.5px] font-semibold text-muted">Actif</label>
      <div className="relative">
        <select
          id="actif-picker"
          value={actifId ?? ''}
          disabled={q.isPending}
          onChange={(e) => navigate(e.target.value ? `/actifs/${e.target.value}${section && section !== 'rapports' ? `/${section}` : ''}` : '/actifs')}
          className="h-11 w-full cursor-pointer appearance-none rounded-field border border-field bg-surface pl-3 pr-9 font-heading text-[14px] font-medium outline-none focus:border-field-focus focus:bg-white"
        >
          <option value="">Tous mes actifs</option>
          {q.data?.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
        </select>
        <Icon name="chevronDown" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      </div>
    </div>
  );
}

function Sidebar({ actifId, onNavigate }: { actifId?: string; onNavigate?: () => void }) {
  const { me, logout } = useAuth();
  const { roles } = useRoles(actifId);
  return (
    <div className="flex h-full flex-col gap-5 px-4 py-5">
      <div className="flex items-center justify-between px-1">
        <NavLink to="/actifs" onClick={onNavigate} aria-label="FRACT, mes actifs"><Logo /></NavLink>
      </div>
      <ActifPicker actifId={actifId} />
      <nav aria-label="Navigation principale" className="-mx-1 flex-1 overflow-y-auto px-1">
        {actifId ? (
          <ul className="space-y-0.5">
            {NAV.map((n) => (
              <li key={n.to}>
                {n.group ? <p className="mb-0.5 mt-3 px-3 font-heading text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-2">{n.group}</p> : null}
                <NavLink
                  to={`/actifs/${actifId}${n.to ? `/${n.to}` : ''}`}
                  end={n.to === ''}
                  onClick={onNavigate}
                  className={({ isActive }) => cn(
                    'flex h-9 items-center gap-2.5 rounded-full px-3 font-heading text-[14px] transition-colors',
                    isActive ? 'bg-surface-2 font-medium text-ink' : 'text-muted hover:bg-black/5 hover:text-ink',
                  )}
                >
                  <Icon name={n.icon} className="h-[18px] w-[18px]" />
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        ) : (
          <NavLink to="/actifs" end onClick={onNavigate} className={({ isActive }) => cn('flex h-10 items-center gap-2.5 rounded-full px-3 font-heading text-[14px]', isActive ? 'bg-surface-2 font-medium' : 'text-muted hover:bg-black/5')}>
            <Icon name="home" /> Mes actifs
          </NavLink>
        )}
      </nav>
      <div className="border-t border-line pt-4">
        <div className="flex items-center gap-3 px-1">
          <span className="grid h-9 w-9 flex-none place-items-end overflow-hidden rounded-full bg-ink text-white" aria-hidden="true">
            <svg viewBox="0 0 36 36" className="h-9 w-9" fill="#5c5c5c"><circle cx="18" cy="14" r="6.5" /><path d="M5 36c1.5-7.5 6.8-11.5 13-11.5S29.5 28.5 31 36Z" /></svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-[13.5px] font-semibold">{me?.compte.nom ?? '…'}</p>
            <p className="truncate text-[12.5px] text-muted">{roles.length ? roles.map((r) => ROLE[r]).join(', ') : me?.compte.email}</p>
          </div>
          <button onClick={logout} className="grid h-9 w-9 flex-none place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink" aria-label="Se déconnecter" title="Se déconnecter">
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { actifId } = useParams();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <div className="min-h-svh bg-white lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Aller au contenu</a>
      <aside className="sticky top-0 hidden h-svh border-r border-line lg:block">
        <Sidebar actifId={actifId} />
      </aside>
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 lg:hidden">
        <Logo className="text-[20px]" />
        <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full bg-black/5" aria-label="Ouvrir le menu" aria-expanded={open}>
          <Icon name="menu" />
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/30" aria-label="Fermer le menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] bg-white">
            <Sidebar actifId={actifId} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
      <main id="contenu" className="min-w-0 px-[clamp(16px,3.2vw,44px)] pb-16 pt-8">
        <div className="mx-auto max-w-[1240px]">
          {actifId ? <ActifGate actifId={actifId} /> : <Outlet />}
        </div>
      </main>
    </div>
  );
}

function ActifGate({ actifId }: { actifId: string }) {
  const q = useActif(actifId);
  if (q.isPending) return <SkeletonBlock rows={6} />;
  if (q.isError) {
    if (isApiError(q.error) && q.error.status === 403) return <Forbidden />;
    if (isApiError(q.error) && q.error.status === 404) return <NotFoundBlock what="Cet actif" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  return <Outlet context={q.data} />;
}
