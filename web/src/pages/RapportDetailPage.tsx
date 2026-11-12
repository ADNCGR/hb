import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import { isApiError } from '@/api/errors';
import { useActifMutation, useRapport, useVueInvestisseur } from '@/api/hooks';
import type { RapportDetail, StatutRapport } from '@/api/types';
import { Notice, PageHeader, RapportBadge, Section } from '@/components/common';
import { EmptyState, ErrorState, NotFoundBlock, SkeletonBlock } from '@/components/states';
import { useToast } from '@/components/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, FormError, Textarea } from '@/components/ui/form';
import { Icon } from '@/components/ui/Icon';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useActifCtx } from '@/layout/useActifCtx';
import { cn } from '@/lib/cn';
import { dateCourte, dateHeure, STATUT_RAPPORT } from '@/lib/format';
import { CHAMPS_RAPPORT, montant, RapportForm } from './RapportsPage';

const ETATS: StatutRapport[] = ['BROUILLON', 'SOUMIS', 'VALIDE', 'PUBLIE'];

export function RapportDetailPage() {
  const actif = useActifCtx();
  const { rapportId = '' } = useParams();
  const q = useRapport(rapportId);
  if (q.isPending) return <SkeletonBlock rows={8} />;
  if (q.isError) {
    if (isApiError(q.error) && q.error.status === 404) return <NotFoundBlock what="Ce rapport" />;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  if (q.data.actifId !== actif.id) return <NotFoundBlock what="Ce rapport" />;
  return <Detail r={q.data} actifId={actif.id} updatedAt={q.dataUpdatedAt} />;
}

function Detail({ r, actifId, updatedAt }: { r: RapportDetail; actifId: string; updatedAt: number }) {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<null | 'modifier' | 'refuser' | 'corriger' | 'investisseur' | 'publier'>(null);
  const prev = r.versions.find((v) => v.id === r.versionPrecedenteId) ?? null;
  const latest = r.versions[r.versions.length - 1];
  const refusals = r.transitions.filter((t) => t.version === r.version && t.de === 'SOUMIS' && t.vers === 'BROUILLON');
  const lastRefusal = refusals[refusals.length - 1];

  return (
    <>
      <nav className="mb-4 text-[14px]"><Link to=".." relative="path" className="inline-flex items-center gap-1.5 text-muted hover:text-ink"><Icon name="arrowLeft" className="h-4 w-4" />Tous les rapports</Link></nav>
      <PageHeader
        title={<span className="inline-flex flex-wrap items-center gap-3">Rapport {r.periode} <RapportBadge s={r.statut} /></span>}
        sub={`Version ${r.version}, rédigée par ${r.auteurNom}`}
        donneesAu={updatedAt}
        actions={<Actions r={r} actifId={actifId} open={setDialog} />}
      />
      <div className="space-y-5">
        {r.versions.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Versions">
            <span className="mr-1 font-heading text-[13.5px] font-semibold">Versions</span>
            {r.versions.map((v) => (
              <button
                key={v.id}
                aria-current={v.id === r.id ? 'page' : undefined}
                onClick={() => navigate(`../${v.id}`, { relative: 'path' })}
                className={cn('inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13.5px]', v.id === r.id ? 'bg-ink text-white' : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] hover:bg-surface')}
              >
                v{v.version} ({STATUT_RAPPORT[v.statut].toLowerCase()})
              </button>
            ))}
          </div>
        ) : null}
        {r.id !== latest.id ? <Notice tone="wait" icon="history">Version {r.version} : une version plus récente (v{latest.version}) existe. Cette version publiée reste inchangée.</Notice> : null}
        {r.statut === 'BROUILLON' && lastRefusal ? (
          <Notice tone="bad" icon="alert"><b>Refusé le {dateCourte(lastRefusal.le)} par {lastRefusal.parNom}.</b> Motif : {lastRefusal.motif}</Notice>
        ) : null}
        {r.motifCorrection ? <Notice icon="edit"><b>Correction de la version {r.version - 1}.</b> Motif : {r.motifCorrection}</Notice> : null}

        <Section title="États">
          <Timeline r={r} />
        </Section>

        <Section title="Contenu" sub={prev ? `Les valeurs qui diffèrent de la version ${prev.version} sont surlignées.` : undefined}>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {CHAMPS_RAPPORT.map(([k, label]) => {
              const changed = prev && prev.contenu[k] !== r.contenu[k];
              return (
                <div key={k} className={cn('rounded-row p-4', changed ? 'bg-wait-soft' : 'bg-surface')}>
                  <dt className="kicker">{label}{changed ? <Badge tone="wait" className="ml-2">Modifié</Badge> : null}</dt>
                  <dd className={cn('tnum mt-1.5 font-heading text-[20px] font-semibold tracking-[-0.02em]', k === 'resultatCentimes' && r.contenu.resultatCentimes < 0 && 'text-bad')}>{montant(r.contenu, k)}</dd>
                  {changed ? <dd className="tnum mt-0.5 text-[12.5px] text-wait">v{prev.version} : <s>{montant(prev.contenu, k)}</s></dd> : null}
                </div>
              );
            })}
          </dl>
          <div className={cn('mt-4 rounded-row p-4', prev && prev.contenu.faitsMarquants !== r.contenu.faitsMarquants ? 'bg-wait-soft' : 'bg-surface')}>
            <p className="kicker">Faits marquants</p>
            <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-relaxed">{r.contenu.faitsMarquants || <span className="text-muted">Aucun.</span>}</p>
          </div>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-[13.5px] text-muted">
            <div>Auteur : <span className="text-ink">{r.auteurNom}</span></div>
            <div>Vérificateur : <span className="text-ink">{r.verificateurNom ?? '-'}</span></div>
            <div>Publié par : <span className="text-ink">{r.publieParNom ?? '-'}</span>{r.publieLe ? ` le ${dateCourte(r.publieLe)}` : ''}</div>
          </dl>
        </Section>

        <Section title="Historique des transitions" sub="Toutes les versions de cette période">
          <Table>
            <THead><TR><TH>Date</TH><TH>Version</TH><TH>Transition</TH><TH>Par</TH><TH>Motif</TH></TR></THead>
            <TBody>
              {r.transitions.map((t) => (
                <TR key={t.id}>
                  <TD className="whitespace-nowrap">{dateHeure(t.le)}</TD>
                  <TD>v{t.version}</TD>
                  <TD className="whitespace-nowrap">{t.de ? <>{STATUT_RAPPORT[t.de]} <Icon name="arrow" className="mx-1 inline h-3.5 w-3.5 text-muted" /> </> : 'Création : '}{STATUT_RAPPORT[t.vers]}</TD>
                  <TD className="whitespace-nowrap">{t.parNom}</TD>
                  <TD className="text-[13.5px] text-muted">{t.motif ?? '-'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
      </div>

      {dialog === 'modifier' ? <RapportForm actifId={actifId} rapport={r} onClose={() => setDialog(null)} /> : null}
      {dialog === 'refuser' || dialog === 'corriger' ? <MotifDialog kind={dialog} r={r} actifId={actifId} onClose={() => setDialog(null)} /> : null}
      {dialog === 'publier' ? <PublierDialog r={r} actifId={actifId} onClose={() => setDialog(null)} /> : null}
      <VueInvestisseur r={r} open={dialog === 'investisseur'} onClose={() => setDialog(null)} />
    </>
  );
}

function Timeline({ r }: { r: RapportDetail }) {
  const idx = ETATS.indexOf(r.statut);
  const own = r.transitions.filter((t) => t.version === r.version);
  const when = (s: StatutRapport) => [...own].reverse().find((t) => t.vers === s)?.le;
  return (
    <ol className="grid gap-3 sm:grid-cols-4" aria-label="Frise des états">
      {ETATS.map((s, i) => {
        const done = i <= idx;
        const current = i === idx;
        return (
          <li key={s} className="relative" aria-current={current ? 'step' : undefined}>
            <div className={cn('mb-2.5 h-1 rounded-full', done ? 'bg-ink' : 'bg-surface-2')} />
            <p className={cn('flex items-center gap-2 font-heading text-[14px]', done ? 'font-semibold text-ink' : 'text-muted')}>
              <span className={cn('grid h-5 w-5 place-items-center rounded-full text-[11px]', current ? 'bg-ink text-white' : done ? 'bg-surface-2 text-ink' : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]')}>
                {done && (!current || s === 'PUBLIE') ? <Icon name="check" className="h-3 w-3" strokeWidth={2.4} /> : i + 1}
              </span>
              {STATUT_RAPPORT[s]}
            </p>
            <p className="mt-0.5 pl-7 text-[12.5px] text-muted">{done && when(s) ? dateCourte(when(s)!) : current ? '' : 'À venir'}</p>
          </li>
        );
      })}
    </ol>
  );
}

function Actions({ r, actifId, open }: { r: RapportDetail; actifId: string; open: (d: 'modifier' | 'refuser' | 'corriger' | 'investisseur' | 'publier') => void }) {
  const toast = useToast();
  const soumettre = useActifMutation(actifId, () => api.rapports.soumettre(r.id));
  const valider = useActifMutation(actifId, () => api.rapports.valider(r.id));
  const can = (a: RapportDetail['actionsPermises'][number]) => r.actionsPermises.includes(a);
  const run = async (m: typeof soumettre, ok: string) => {
    try { await m.mutateAsync(undefined); toast(ok); } catch (e) { toast(isApiError(e) ? e.message : 'Action refusée.', 'bad'); }
  };
  return (
    <>
      <Button variant="quiet" size="sm" onClick={() => open('investisseur')}><Icon name="eye" className="h-4 w-4" />Voir comme un investisseur</Button>
      {can('MODIFIER') ? <Button variant="quiet" size="sm" onClick={() => open('modifier')}><Icon name="edit" className="h-4 w-4" />Modifier</Button> : null}
      {can('SOUMETTRE') ? <Button size="sm" loading={soumettre.isPending} onClick={() => run(soumettre, 'Rapport soumis au vérificateur.')}>Soumettre</Button> : null}
      {can('REFUSER') ? <Button variant="danger" size="sm" onClick={() => open('refuser')}>Refuser</Button> : null}
      {can('VALIDER') ? <Button size="sm" loading={valider.isPending} onClick={() => run(valider, 'Rapport validé. Les écritures de la période sont verrouillées.')}>Valider</Button> : null}
      {can('PUBLIER') ? <Button size="sm" onClick={() => open('publier')}>Publier</Button> : null}
      {can('CORRIGER') ? <Button variant="quiet" size="sm" onClick={() => open('corriger')}>Corriger (nouvelle version)</Button> : null}
    </>
  );
}

function MotifDialog({ kind, r, actifId, onClose }: { kind: 'refuser' | 'corriger'; r: RapportDetail; actifId: string; onClose: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [motif, setMotif] = useState('');
  const [error, setError] = useState<string | null>(null);
  const m = useActifMutation(actifId, (x: string) => (kind === 'refuser' ? api.rapports.refuser(r.id, x) : api.rapports.corriger(r.id, x)));
  async function go() {
    setError(null);
    if (motif.trim().length < 5) { setError('Le motif est obligatoire (5 caractères au moins).'); return; }
    try {
      const res = await m.mutateAsync(motif.trim());
      onClose();
      if (kind === 'corriger') { toast(`Version ${res.version} créée en brouillon. La version publiée reste inchangée.`); navigate(`../${res.id}`, { relative: 'path' }); } else toast('Rapport renvoyé en brouillon avec le motif.');
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Action refusée.');
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={kind === 'refuser' ? `Refuser le rapport ${r.periode}` : `Corriger le rapport ${r.periode}`}
      description={kind === 'refuser' ? 'Le rapport revient en brouillon chez son auteur, avec votre motif.' : `La version ${r.version} publiée ne sera pas modifiée : une version ${r.version + 1} est créée en brouillon.`}
      footer={<><Button variant="quiet" onClick={onClose}>Annuler</Button><Button variant={kind === 'refuser' ? 'danger' : 'primary'} loading={m.isPending} onClick={go}>{kind === 'refuser' ? 'Refuser' : 'Créer la version ' + (r.version + 1)}</Button></>}
    >
      <div className="grid gap-3">
        <FormError message={error} />
        <Field label={kind === 'refuser' ? 'Motif du refus' : 'Motif de la correction'} hint="Obligatoire. Il reste dans l’historique."><Textarea value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus /></Field>
      </div>
    </Dialog>
  );
}

function PublierDialog({ r, actifId, onClose }: { r: RapportDetail; actifId: string; onClose: () => void }) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const m = useActifMutation(actifId, () => api.rapports.publier(r.id));
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Publier le rapport ${r.periode} v${r.version}`}
      description="Les investisseurs verront cette version. Une fois publiée, elle ne pourra plus être modifiée : toute correction créera une nouvelle version."
      footer={<><Button variant="quiet" onClick={onClose}>Annuler</Button><Button loading={m.isPending} onClick={async () => {
        setError(null);
        try { await m.mutateAsync(undefined); toast('Rapport publié aux investisseurs.'); onClose(); } catch (e) { setError(isApiError(e) ? e.message : 'Publication refusée.'); }
      }}>Publier</Button></>}
    >
      <FormError message={error} />
    </Dialog>
  );
}

function VueInvestisseur({ r, open, onClose }: { r: RapportDetail; open: boolean; onClose: () => void }) {
  const q = useVueInvestisseur(r.id, open);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} wide title="Vue investisseur" description="Ce que voit un investisseur : seulement la dernière version publiée.">
      {q.isPending ? <SkeletonBlock rows={4} /> : q.isError ? (
        isApiError(q.error) && q.error.status === 404
          ? <EmptyState icon="eye" title="Rien de publié">{q.error.message}</EmptyState>
          : <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <article className="rounded-card bg-surface p-6">
          <p className="kicker">Rapport trimestriel, {q.data.actifNom}</p>
          <h3 className="mt-1 font-heading text-[26px] font-semibold tracking-[-0.03em]">{q.data.periode}</h3>
          <p className="text-[13.5px] text-muted">Version {q.data.version}, publiée le {dateCourte(q.data.publieLe)}</p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            {CHAMPS_RAPPORT.map(([k, label]) => (
              <div key={k} className="rounded-row bg-white p-4"><dt className="kicker">{label}</dt><dd className="tnum mt-1 font-heading text-[19px] font-semibold">{montant(q.data.contenu, k)}</dd></div>
            ))}
          </dl>
          {q.data.contenu.faitsMarquants ? <p className="mt-5 whitespace-pre-line text-[14.5px] leading-relaxed">{q.data.contenu.faitsMarquants}</p> : null}
          <p className="mt-5 border-t border-line pt-4 text-[12.5px] text-muted">{q.data.mention}</p>
        </article>
      )}
    </Dialog>
  );
}
