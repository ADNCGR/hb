import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { isApiError } from '@/api/errors';
import { useActifMutation, useRapports } from '@/api/hooks';
import type { ContenuRapport, Rapport } from '@/api/types';
import { useRoles } from '@/auth/AuthContext';
import { PageHeader, RapportBadge } from '@/components/common';
import { EmptyState, Q, SkeletonBlock } from '@/components/states';
import { useToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, FormError, Input, Textarea } from '@/components/ui/form';
import { Icon } from '@/components/ui/Icon';
import { useActifCtx } from '@/layout/useActifCtx';
import { centimesVersSaisie, dateCourte, euros, parseEuros } from '@/lib/format';

export function RapportsPage() {
  const actif = useActifCtx();
  const { has } = useRoles(actif.id);
  const q = useRapports(actif.id);
  const [creating, setCreating] = useState(false);
  const groups = useMemo(() => {
    const m = new Map<string, Rapport[]>();
    for (const r of q.data ?? []) m.set(r.periode, [...(m.get(r.periode) ?? []), r]);
    return [...m.entries()].map(([periode, vs]) => ({ periode, versions: vs.sort((a, b) => b.version - a.version) }));
  }, [q.data]);

  return (
    <>
      <PageHeader
        title="Rapports trimestriels"
        sub="Rapports publiés aux investisseurs et rapports en préparation"
        donneesAu={q.dataUpdatedAt || null}
        actions={has('FINANCE_AUTEUR') ? <Button dot onClick={() => setCreating(true)}>Nouveau rapport</Button> : null}
      />
      <Q query={q} skeleton={<SkeletonBlock rows={5} />} empty={(d) => d.length === 0 && <EmptyState icon="file" title="Aucun rapport">L’équipe financière rédige le premier rapport après la clôture de la levée.</EmptyState>}>
        {() => (
          <ul className="grid gap-2">
            {groups.map(({ periode, versions }) => {
              const last = versions[0];
              const published = versions.find((v) => v.statut === 'PUBLIE');
              return (
                <li key={periode}>
                  <Link to={last.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-row border border-line px-5 py-4 hover:border-line-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                    <span className="min-w-0">
                      <b className="block font-heading text-[16px] font-semibold">{periode}</b>
                      <small className="block text-[13.5px] text-muted">
                        Version {last.version}{versions.length > 1 ? ` sur ${versions.length}` : ''}, par {last.auteurNom}
                      </small>
                    </span>
                    <span className="hidden text-right text-[13.5px] text-muted sm:block">
                      {published ? <>Publiée v{published.version} le {dateCourte(published.publieLe!)}</> : 'Pas encore publiée'}
                    </span>
                    <RapportBadge s={last.statut} />
                    <Icon name="arrow" className="hidden text-muted sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Q>
      {creating ? <RapportForm actifId={actif.id} onClose={() => setCreating(false)} /> : null}
    </>
  );
}

function trimestreCourant() {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3);
  return q === 0 ? `T4 ${d.getFullYear() - 1}` : `T${q} ${d.getFullYear()}`;
}

export function RapportForm({ actifId, rapport, onClose }: { actifId: string; rapport?: Rapport; onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const c = rapport?.contenu;
  const [periode, setPeriode] = useState(rapport?.periode ?? trimestreCourant());
  const [f, setF] = useState({
    ca: c ? centimesVersSaisie(c.caCentimes) : '', charges: c ? centimesVersSaisie(c.chargesCentimes) : '',
    tresorerie: c ? centimesVersSaisie(c.tresorerieCentimes) : '', dettes: c ? centimesVersSaisie(c.dettesCentimes) : '', faits: c?.faitsMarquants ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [prefilling, setPrefilling] = useState(false);
  const m = useActifMutation(actifId, (b: { periode: string; contenu: ContenuRapport }) => (rapport ? api.rapports.patch(rapport.id, b.contenu) : api.rapports.create(actifId, b)));

  async function prefill() {
    setPrefilling(true);
    setError(null);
    try {
      const p = await api.rapports.preRemplissage(actifId, periode.trim());
      setF((x) => ({ ...x, ca: centimesVersSaisie(p.caCentimes), charges: centimesVersSaisie(p.chargesCentimes) }));
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Pré-remplissage impossible.');
    } finally {
      setPrefilling(false);
    }
  }

  async function submit() {
    const e: Record<string, string> = {};
    if (!/^T[1-4] \d{4}$/.test(periode.trim())) e.periode = 'La période doit être de la forme « T3 2026 ».';
    const nums = { ca: parseEuros(f.ca), charges: parseEuros(f.charges), tresorerie: parseEuros(f.tresorerie), dettes: parseEuros(f.dettes) };
    (Object.keys(nums) as (keyof typeof nums)[]).forEach((k) => { if (nums[k] === null) e[k] = 'Montant positif ou nul attendu.'; });
    setErrors(e);
    if (Object.keys(e).length) return;
    setError(null);
    try {
      const r = await m.mutateAsync({
        periode: periode.trim(),
        contenu: { caCentimes: nums.ca!, chargesCentimes: nums.charges!, resultatCentimes: nums.ca! - nums.charges!, tresorerieCentimes: nums.tresorerie!, dettesCentimes: nums.dettes!, faitsMarquants: f.faits },
      });
      toast(rapport ? 'Brouillon enregistré.' : `Rapport ${r.periode} créé en brouillon.`);
      onClose();
      if (!rapport) navigate(r.id);
    } catch (err) {
      if (isApiError(err) && err.details) setErrors(Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k.replace('Centimes', '').replace('faitsMarquants', 'faits'), v])));
      setError(isApiError(err) ? err.message : 'L’enregistrement a échoué.');
    }
  }

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <Dialog
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title={rapport ? `Modifier le brouillon ${rapport.periode} v${rapport.version}` : 'Nouveau rapport trimestriel'}
      description="Le résultat est calculé automatiquement (chiffre d’affaires moins charges)."
      footer={<><Button variant="quiet" onClick={onClose}>Annuler</Button><Button loading={m.isPending} onClick={submit}>{rapport ? 'Enregistrer' : 'Créer le brouillon'}</Button></>}
    >
      <div className="grid gap-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-[200px_auto] sm:items-end">
          <Field label="Période" error={errors.periode}><Input value={periode} onChange={(e) => setPeriode(e.target.value)} disabled={!!rapport} placeholder="T3 2026" /></Field>
          <Button variant="quiet" className="justify-self-start" loading={prefilling} onClick={prefill}><Icon name="refresh" className="h-4 w-4" />Pré-remplir CA et charges depuis les données</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Chiffre d’affaires (€)" error={errors.ca}><Input inputMode="decimal" value={f.ca} onChange={set('ca')} /></Field>
          <Field label="Charges (€)" error={errors.charges}><Input inputMode="decimal" value={f.charges} onChange={set('charges')} /></Field>
          <Field label="Trésorerie en fin de période (€)" error={errors.tresorerie}><Input inputMode="decimal" value={f.tresorerie} onChange={set('tresorerie')} /></Field>
          <Field label="Dettes (€)" error={errors.dettes}><Input inputMode="decimal" value={f.dettes} onChange={set('dettes')} /></Field>
        </div>
        <Field label="Faits marquants" error={errors.faits}><Textarea value={f.faits} onChange={set('faits')} rows={4} /></Field>
        <p className="text-[13px] text-muted">Montants en euros. Aucune valorisation ni aucun cours de revente n’est publié.</p>
      </div>
    </Dialog>
  );
}

export const CHAMPS_RAPPORT: [keyof ContenuRapport, string][] = [
  ['caCentimes', 'Chiffre d’affaires'],
  ['chargesCentimes', 'Charges'],
  ['resultatCentimes', 'Résultat'],
  ['tresorerieCentimes', 'Trésorerie'],
  ['dettesCentimes', 'Dettes'],
];
export const montant = (c: ContenuRapport, k: keyof ContenuRapport) => euros(c[k] as number);
