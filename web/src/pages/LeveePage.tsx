import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/api/client';
import { isApiError } from '@/api/errors';
import { useActifMutation, useOffre, useUsageFonds } from '@/api/hooks';
import type { Offre, UsageFonds } from '@/api/types';
import { useRoles } from '@/auth/AuthContext';
import { EcritureBadge, Facts, Notice, PageHeader, Section, Stat } from '@/components/common';
import { EmptyState, ErrorState, Q, SkeletonBlock, SkeletonCards } from '@/components/states';
import { useToast } from '@/components/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input, Textarea } from '@/components/ui/form';
import { Icon } from '@/components/ui/Icon';
import { useActifCtx } from '@/layout/useActifCtx';
import { centimesVersSaisie, dateCourte, euros, nombre, parseEuros, pourcent, STATUT_OFFRE } from '@/lib/format';
import { PartsBar } from './DashboardPage';

export function LeveePage() {
  const actif = useActifCtx();
  const q = useOffre(actif.id);
  const noOffer = q.isError && isApiError(q.error) && q.error.status === 404;
  return (
    <>
      <PageHeader title="Levée et offre" sub={actif.nom} donneesAu={q.dataUpdatedAt || null} />
      {q.isPending ? <><SkeletonCards /><div className="mt-6"><SkeletonBlock /></div></> : null}
      {q.isError && !noOffer ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : null}
      {noOffer || (q.data && q.data.modifiable) ? <OffreDraft actifId={actif.id} statut={actif.statut} offre={q.data ?? null} /> : null}
      {q.data && !q.data.modifiable ? <OffreFigee offre={q.data} actifId={actif.id} /> : null}
    </>
  );
}

function OffreFigee({ offre: o, actifId }: { offre: Offre; actifId: string }) {
  const usage = useUsageFonds(actifId);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Capital confirmé" value={euros(o.capitalConfirmeCentimes)} foot={`sur ${euros(o.montantLeveCentimes)} proposés`} />
        <Stat label="Parts confirmées" value={nombre(o.partsConfirmees)} foot={`sur ${nombre(o.nbParts)} parts à ${euros(o.prixPartCentimes)}`} />
        <Stat label="Parts en attente" value={nombre(o.partsEnAttente)} badge={<Badge tone="wait" dot>Registre</Badge>} foot="Non comptées dans le capital" />
        <Stat label="Parts échouées" value={nombre(o.partsEchouees)} badge={<Badge tone="bad" dot>Registre</Badge>} foot="Aucune part attribuée" />
      </div>
      <Section title="Avancement de la levée" sub={`Offre ${STATUT_OFFRE[o.statut].toLowerCase()}, du ${dateCourte(o.ouverture)} au ${dateCourte(o.cloture)}`}>
        <PartsBar confirmees={o.partsConfirmees} enAttente={o.partsEnAttente} total={o.nbParts} />
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13.5px] text-muted">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-ink" />Confirmées : {pourcent((o.partsConfirmees / o.nbParts) * 100)}</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-wait-dot" />En attente : {pourcent((o.partsEnAttente / o.nbParts) * 100)}</span>
        </div>
      </Section>
      <Section title="Conditions de l’offre" sub="Figées depuis l’ouverture de l’offre" action={<Badge tone="line"><Icon name="lock" className="h-3.5 w-3.5" />Non modifiables</Badge>}>
        <Facts items={[
          ['Valeur de référence', <>{euros(o.valeurReferenceCentimes)} <span className="text-muted">(hypothèse au {dateCourte(o.dateValeur)})</span></>],
          ['Fraction proposée', `${o.fractionPct} % des droits économiques`],
          ['Montant proposé', euros(o.montantLeveCentimes)],
          ['Parts', `${nombre(o.nbParts)} parts à ${euros(o.prixPartCentimes)}`],
          ['Période', `du ${dateCourte(o.ouverture)} au ${dateCourte(o.cloture)}`],
          ['Droits attachés', o.droits],
          ['Distribution', o.conditionsDistribution],
          ['Transfert', o.conditionsTransfert],
        ]} />
      </Section>
      <Section title="Usage des fonds" sub="Dépenses rattachées à chaque enveloppe de la levée">
        <Q query={usage} skeleton={<SkeletonBlock rows={3} />}>{(u) => <Usage u={u} />}</Q>
      </Section>
    </div>
  );
}

function Usage({ u }: { u: UsageFonds }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-8 gap-y-1 text-[14px]">
        <span>Prévu <b className="tnum font-heading">{euros(u.totalPrevuCentimes)}</b></span>
        <span>Dépensé <b className="tnum font-heading">{euros(u.totalDepenseCentimes)}</b></span>
        <span>Reste <b className="tnum font-heading">{euros(u.totalResteCentimes)}</b></span>
      </div>
      <ul className="grid gap-2">
        {u.enveloppes.map((e) => (
          <li key={e.id} className="rounded-row border border-line">
            <button className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-left" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>
              <span className="font-heading text-[15px] font-semibold">{e.libelle}</span>
              <span className="tnum text-[13.5px] text-muted">{euros(e.depenseCentimes)} / {euros(e.montantPrevuCentimes)}, reste <b className="text-ink">{euros(e.resteCentimes)}</b></span>
              <span className="col-span-2 flex items-center gap-3">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-ink" style={{ width: `${Math.min(100, e.pctConsomme)}%` }} /></span>
                <span className="tnum w-14 text-right text-[13px] text-muted">{pourcent(e.pctConsomme)}</span>
                <Icon name="chevronDown" className={`h-4 w-4 text-muted transition-transform ${open === e.id ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {open === e.id ? (
              <div className="border-t border-line px-4 py-3">
                {e.depenses.length ? (
                  <ul className="divide-y divide-line text-[14px]">
                    {e.depenses.map((x) => (
                      <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span>{dateCourte(x.date)}, {x.fournisseur} <span className="text-muted">({x.categorie})</span></span>
                        <span className="flex items-center gap-3"><EcritureBadge s={x.statut} /><b className="tnum font-heading">{euros(x.montantCentimes)}</b></span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-[14px] text-muted">Aucune dépense rattachée.</p>}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

const euroStr = (label: string) => z.string().trim().refine((s) => (parseEuros(s) ?? 0) > 0, `${label} doit être un montant positif.`);
const schema = z.object({
  valeur: euroStr('La valeur de référence'),
  dateValeur: z.string().min(1, 'Indiquez la date de la valeur.'),
  fraction: z.string().trim().refine((s) => { const n = Number(s.replace(',', '.')); return n > 0 && n <= 49; }, 'La fraction doit être comprise entre 0 et 49 %.'),
  prixPart: euroStr('Le prix d’une part'),
  nbParts: z.string().trim().refine((s) => /^\d+$/.test(s) && Number(s) > 0, 'Le nombre de parts doit être un entier positif.'),
  droits: z.string().trim().min(10, 'Décrivez les droits attachés aux parts (10 caractères au moins).'),
  conditionsDistribution: z.string().trim().min(10, 'Décrivez les conditions de distribution.'),
  conditionsTransfert: z.string().trim().min(10, 'Décrivez les conditions de transfert.'),
  ouverture: z.string().min(1, 'Indiquez la date d’ouverture.'),
  cloture: z.string().min(1, 'Indiquez la date de clôture.'),
  enveloppes: z.array(z.object({ libelle: z.string().trim().min(2, 'Libellé obligatoire.'), montant: euroStr('Le montant') })),
}).refine((v) => !v.ouverture || !v.cloture || v.cloture > v.ouverture, { path: ['cloture'], message: 'La clôture doit suivre l’ouverture.' });
type Form = z.infer<typeof schema>;

function toForm(o: Offre | null): Form {
  if (!o) {
    return { valeur: '', dateValeur: '', fraction: '', prixPart: '100', nbParts: '', droits: '', conditionsDistribution: '', conditionsTransfert: '', ouverture: '', cloture: '', enveloppes: [{ libelle: '', montant: '' }] };
  }
  return {
    valeur: centimesVersSaisie(o.valeurReferenceCentimes), dateValeur: o.dateValeur.slice(0, 10), fraction: String(o.fractionPct), prixPart: centimesVersSaisie(o.prixPartCentimes),
    nbParts: String(o.nbParts), droits: o.droits, conditionsDistribution: o.conditionsDistribution, conditionsTransfert: o.conditionsTransfert,
    ouverture: o.ouverture.slice(0, 10), cloture: o.cloture.slice(0, 10), enveloppes: o.enveloppes.map((e) => ({ libelle: e.libelle, montant: centimesVersSaisie(e.montantPrevuCentimes) })),
  };
}

function OffreDraft({ actifId, statut, offre }: { actifId: string; statut: string; offre: Offre | null }) {
  const { isOwner } = useRoles(actifId);
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const m = useActifMutation(actifId, (b: Parameters<typeof api.offre.put>[1]) => api.offre.put(actifId, b));
  const { register, control, handleSubmit, setError: setFieldError, formState: { errors, isDirty } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: toForm(offre) });
  const env = useFieldArray({ control, name: 'enveloppes' });
  const v = useWatch({ control });

  if (statut !== 'PREPARATION') {
    return <EmptyState icon="layers" title="Aucune offre">Cet actif n’a pas d’offre enregistrée.</EmptyState>;
  }
  if (!isOwner) {
    return <EmptyState icon="layers" title="Offre en préparation">Le propriétaire n’a pas encore rédigé l’offre de cet actif.</EmptyState>;
  }

  const valeur = parseEuros(v.valeur ?? '') ?? 0;
  const fraction = Number((v.fraction ?? '').replace(',', '.')) || 0;
  const prix = parseEuros(v.prixPart ?? '') ?? 0;
  const parts = Number(v.nbParts) || 0;
  const montant = Math.round((valeur * fraction) / 100);
  const produit = prix * parts;
  const totalEnv = (v.enveloppes ?? []).reduce((a, e) => a + (parseEuros(e?.montant ?? '') ?? 0), 0);
  const partsSuggerees = prix > 0 && montant % prix === 0 ? montant / prix : null;

  const submit = handleSubmit(async (f) => {
    setError(null);
    try {
      await m.mutateAsync({
        valeurReferenceCentimes: parseEuros(f.valeur)!, dateValeur: new Date(f.dateValeur).toISOString(), fractionPct: Number(f.fraction.replace(',', '.')),
        prixPartCentimes: parseEuros(f.prixPart)!, nbParts: Number(f.nbParts), droits: f.droits, conditionsDistribution: f.conditionsDistribution,
        conditionsTransfert: f.conditionsTransfert, ouverture: new Date(f.ouverture).toISOString(), cloture: new Date(`${f.cloture}T23:59:00`).toISOString(),
        enveloppes: f.enveloppes.map((e) => ({ libelle: e.libelle, montantPrevuCentimes: parseEuros(e.montant)! })),
      });
      toast('Brouillon d’offre enregistré.');
    } catch (e) {
      if (isApiError(e) && e.details) {
        const map: Record<string, keyof Form> = { valeurReferenceCentimes: 'valeur', fractionPct: 'fraction', prixPartCentimes: 'prixPart' };
        Object.entries(e.details).forEach(([k, msg]) => setFieldError((map[k] ?? k) as keyof Form, { message: msg }));
      }
      setError(isApiError(e) ? e.message : 'L’enregistrement a échoué.');
    }
  });

  const check = (ok: boolean, label: string) => (
    <li className={`flex items-start gap-2 ${ok ? 'text-ok' : 'text-muted'}`}><Icon name={ok ? 'check' : 'info'} className="mt-0.5 h-4 w-4" />{label}</li>
  );

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Notice icon="edit">L’actif est en préparation : l’offre reste un brouillon modifiable. Elle sera figée à son ouverture par l’équipe FRACT.</Notice>
        <FormError message={error} />
        <Section title="Valeur et fraction">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valeur de référence (€)" hint="Hypothèse retenue, pas une valorisation." error={errors.valeur?.message}><Input inputMode="decimal" {...register('valeur')} placeholder="500 000" /></Field>
            <Field label="Date de la valeur" error={errors.dateValeur?.message}><Input type="date" {...register('dateValeur')} /></Field>
            <Field label="Fraction proposée (%)" hint="Part des droits économiques proposée aux investisseurs." error={errors.fraction?.message}><Input inputMode="decimal" {...register('fraction')} placeholder="20" /></Field>
            <Field label="Prix d’une part (€)" error={errors.prixPart?.message}><Input inputMode="decimal" {...register('prixPart')} /></Field>
            <Field label="Nombre de parts" error={errors.nbParts?.message} hint={partsSuggerees ? `Pour ${euros(montant)} à ${euros(prix)} la part : ${nombre(partsSuggerees)} parts.` : undefined}><Input inputMode="numeric" {...register('nbParts')} /></Field>
          </div>
        </Section>
        <Section title="Période">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ouverture" error={errors.ouverture?.message}><Input type="date" {...register('ouverture')} /></Field>
            <Field label="Clôture" error={errors.cloture?.message}><Input type="date" {...register('cloture')} /></Field>
          </div>
        </Section>
        <Section title="Droits et conditions">
          <div className="grid gap-4">
            <Field label="Droits attachés aux parts" error={errors.droits?.message}><Textarea {...register('droits')} /></Field>
            <Field label="Conditions de distribution" error={errors.conditionsDistribution?.message}><Textarea {...register('conditionsDistribution')} /></Field>
            <Field label="Conditions de transfert" error={errors.conditionsTransfert?.message}><Textarea {...register('conditionsTransfert')} /></Field>
          </div>
        </Section>
        <Section title="Enveloppes d’usage des fonds" sub="La somme des enveloppes doit égaler le montant proposé." action={<Button type="button" size="sm" variant="quiet" onClick={() => env.append({ libelle: '', montant: '' })}><Icon name="plus" className="h-4 w-4" />Ajouter</Button>}>
          <div className="grid gap-3">
            {env.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[minmax(0,1fr)_160px_auto] items-start gap-2">
                <Field label={<span className="sr-only">Libellé de l’enveloppe {i + 1}</span>} error={errors.enveloppes?.[i]?.libelle?.message}><Input placeholder="Rénovation" {...register(`enveloppes.${i}.libelle`)} /></Field>
                <Field label={<span className="sr-only">Montant de l’enveloppe {i + 1} en euros</span>} error={errors.enveloppes?.[i]?.montant?.message}><Input inputMode="decimal" placeholder="Montant €" {...register(`enveloppes.${i}.montant`)} /></Field>
                <Button type="button" variant="ghost" size="icon" className="mt-[22px]" aria-label={`Retirer l’enveloppe ${i + 1}`} onClick={() => env.remove(i)} disabled={env.fields.length === 1}><Icon name="close" className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </Section>
      </div>
      <aside className="space-y-4 xl:sticky xl:top-6">
        <Section title="Calcul en direct">
          <dl className="space-y-2.5 text-[14px]">
            <div className="flex justify-between gap-3"><dt className="text-muted">Montant proposé</dt><dd className="tnum font-heading font-semibold">{euros(montant)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Parts × prix</dt><dd className="tnum font-heading font-semibold">{euros(produit)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Somme des enveloppes</dt><dd className="tnum font-heading font-semibold">{euros(totalEnv)}</dd></div>
          </dl>
          <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-[13.5px]">
            {check(montant > 0 && produit === montant, 'Parts × prix = montant proposé')}
            {check(montant > 0 && totalEnv === montant, 'Enveloppes = montant proposé')}
            {check(fraction > 0 && fraction <= 49, 'Fraction entre 0 et 49 %')}
          </ul>
        </Section>
        <Button type="submit" className="w-full" loading={m.isPending} disabled={!isDirty && !!offre}>Enregistrer le brouillon</Button>
      </aside>
    </form>
  );
}
