import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/api/client';
import { CATEGORIES_ECRITURE, FORMATS_DOCUMENT, TAILLE_MAX_DOCUMENT } from '@/api/constants';
import { isApiError } from '@/api/errors';
import { useActifMutation, useEcritures, useOffre } from '@/api/hooks';
import type { Ecriture, EcritureCreation, StatutEcriture } from '@/api/types';
import { useRoles } from '@/auth/AuthContext';
import { EcritureBadge, Notice, PageHeader, Pager } from '@/components/common';
import { DocLink } from '@/components/DocLink';
import { EmptyState, Q, SkeletonBlock } from '@/components/states';
import { useToast } from '@/components/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Dialog } from '@/components/ui/dialog';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/form';
import { Icon } from '@/components/ui/Icon';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useActifCtx } from '@/layout/useActifCtx';
import { centimesVersSaisie, dateCourte, euros, isoJour, parseEuros } from '@/lib/format';

type Filtre = 'TOUT' | StatutEcriture | 'VERROUILLEE';
const PAR_PAGE = 20;

export function ChargesPage() {
  const actif = useActifCtx();
  const { isOwner, isFinance } = useRoles(actif.id);
  const q = useEcritures(actif.id);
  const [filtre, setFiltre] = useState<Filtre>('TOUT');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [correcting, setCorrecting] = useState<Ecriture | null>(null);
  const [controlling, setControlling] = useState<Ecriture | null>(null);
  const byId = useMemo(() => new Map((q.data ?? []).map((e) => [e.id, e])), [q.data]);
  const rows = useMemo(() => (q.data ?? []).filter((e) => filtre === 'TOUT' || (filtre === 'VERROUILLEE' ? e.verrouillee : e.statut === filtre)), [q.data, filtre]);
  const count = (f: (e: Ecriture) => boolean) => (q.data ?? []).filter(f).length;

  return (
    <>
      <PageHeader
        title="Charges"
        sub="Charges et dépenses saisies par le propriétaire, contrôlées par l’équipe financière"
        donneesAu={q.dataUpdatedAt || null}
        actions={isOwner ? <Button dot onClick={() => setCreating(true)}>Saisir une dépense</Button> : null}
      />
      <Q query={q} skeleton={<SkeletonBlock rows={8} />} empty={(d) => d.length === 0 && <EmptyState icon="receipt" title="Aucune écriture" action={isOwner ? <Button onClick={() => setCreating(true)}>Saisir une dépense</Button> : undefined}>Les charges et dépenses saisies apparaîtront ici.</EmptyState>}>
        {() => (
          <div className="space-y-4">
            {count((e) => e.statut === 'A_CONTROLER' && !e.documentId) ? (
              <Notice tone="wait" icon="alert">{count((e) => e.statut === 'A_CONTROLER' && !e.documentId)} dépense à contrôler n’a pas de justificatif. Déposez-le dans Documents pour qu’elle puisse être contrôlée.</Notice>
            ) : null}
            <Chips<Filtre>
              label="Filtrer les écritures"
              value={filtre}
              onChange={(v) => { setFiltre(v); setPage(1); }}
              options={[
                { value: 'TOUT', label: 'Toutes', count: q.data!.length },
                { value: 'A_CONTROLER', label: 'À contrôler', count: count((e) => e.statut === 'A_CONTROLER') },
                { value: 'CONTROLEE', label: 'Contrôlées', count: count((e) => e.statut === 'CONTROLEE') },
                { value: 'REJETEE', label: 'Rejetées', count: count((e) => e.statut === 'REJETEE') },
                { value: 'VERROUILLEE', label: 'Verrouillées', count: count((e) => e.verrouillee) },
              ]}
            />
            {rows.length ? (
              <>
                <Table>
                  <THead><TR><TH>Date</TH><TH>Catégorie</TH><TH>Justificatif</TH><TH>Statut</TH><TH num>Montant</TH><TH><span className="sr-only">Actions</span></TH></TR></THead>
                  <TBody>
                    {rows.slice((page - 1) * PAR_PAGE, page * PAR_PAGE).map((e) => {
                      const corrigee = e.correctionIds.map((id) => byId.get(id)).filter((x) => x && x.statut !== 'REJETEE');
                      return (
                        <TR key={e.id} className={corrigee.length ? 'text-muted' : undefined}>
                          <TD className="whitespace-nowrap align-top">{dateCourte(e.date)}</TD>
                          <TD className="align-top">
                            <b className="block font-medium text-ink">{e.categorie}</b>{e.fournisseur}
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {e.enveloppeLibelle ? <Badge tone="line">Fonds levés : {e.enveloppeLibelle}</Badge> : null}
                              {e.corrigeId ? <Badge tone="line">Corrige l’écriture du {dateCourte(byId.get(e.corrigeId)?.date ?? e.date)}</Badge> : null}
                              {corrigee.length ? <Badge tone="line">Remplacée par une correction</Badge> : null}
                            </div>
                            {e.statut === 'REJETEE' && e.motifRejet ? <p className="mt-1.5 text-[13px] text-bad">Motif du rejet : {e.motifRejet}</p> : null}
                          </TD>
                          <TD className="align-top">{e.documentId && e.documentNom ? <DocLink id={e.documentId} nom={e.documentNom} className="max-w-[220px]" /> : <Badge tone="wait">Manquant</Badge>}</TD>
                          <TD className="align-top">
                            <span className="flex flex-wrap gap-1.5">
                              <EcritureBadge s={e.statut} />
                              {e.verrouillee ? <Badge tone="line" title="Incluse dans un rapport validé"><Icon name="lock" className="h-3 w-3" />Verrouillée</Badge> : null}
                            </span>
                          </TD>
                          <TD num className={`align-top font-medium ${corrigee.length ? 'line-through' : 'text-ink'}`}>{euros(e.montantCentimes, { cents: true })}</TD>
                          <TD className="align-top text-right">
                            <span className="inline-flex gap-1.5">
                              {isFinance && e.statut === 'A_CONTROLER' && !e.verrouillee ? <Button size="xs" variant="quiet" onClick={() => setControlling(e)}>Contrôler</Button> : null}
                              {isOwner && (e.verrouillee || e.statut === 'REJETEE') && !corrigee.length ? <Button size="xs" variant="quiet" onClick={() => setCorrecting(e)}>Corriger</Button> : null}
                            </span>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
                <Pager page={page} pages={Math.max(1, Math.ceil(rows.length / PAR_PAGE))} total={rows.length} onPage={setPage} unit="écritures" />
              </>
            ) : <EmptyState icon="receipt" title="Aucune écriture pour ce filtre" />}
          </div>
        )}
      </Q>
      {creating ? <EcritureDialog actifId={actif.id} onClose={() => setCreating(false)} /> : null}
      {correcting ? <EcritureDialog actifId={actif.id} original={correcting} onClose={() => setCorrecting(null)} /> : null}
      {controlling ? <ControleDialog actifId={actif.id} ecriture={controlling} onClose={() => setControlling(null)} /> : null}
    </>
  );
}

const schema = z.object({
  date: z.string().min(1, 'Indiquez la date.').refine((d) => d <= isoJour(new Date()), 'La date ne peut pas être dans le futur.'),
  categorie: z.string().min(1, 'Choisissez une catégorie.'),
  montant: z.string().trim().refine((s) => (parseEuros(s) ?? 0) > 0, 'Le montant doit être positif.'),
  fournisseur: z.string().trim().min(2, 'Le fournisseur est obligatoire.').max(120),
  enveloppeId: z.string(),
});
type Form = z.infer<typeof schema>;

function EcritureDialog({ actifId, original, onClose }: { actifId: string; original?: Ecriture; onClose: () => void }) {
  const toast = useToast();
  const offre = useOffre(actifId);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const m = useActifMutation(actifId, async (b: EcritureCreation & { file: File | null }) => {
    const { file: f, ...body } = b;
    let documentId: string | null = null;
    if (f) documentId = (await api.documents.deposer(actifId, f, 'Facture')).id;
    return original ? api.ecritures.correction(original.id, { ...body, documentId }) : api.ecritures.create(actifId, { ...body, documentId });
  });
  const { register, handleSubmit, setError: setFieldError, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: original
      ? { date: original.date.slice(0, 10), categorie: original.categorie, montant: centimesVersSaisie(original.montantCentimes), fournisseur: original.fournisseur, enveloppeId: original.enveloppeId ?? '' }
      : { date: isoJour(new Date()), categorie: '', montant: '', fournisseur: '', enveloppeId: '' },
  });

  function pick(f: File | undefined) {
    setFileError(null);
    if (!f) return setFile(null);
    if (!(FORMATS_DOCUMENT as readonly string[]).includes(f.type)) return setFileError('Format refusé : PDF, JPG ou PNG uniquement.');
    if (f.size > TAILLE_MAX_DOCUMENT) return setFileError('Le fichier dépasse 10 Mo.');
    setFile(f);
  }

  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      await m.mutateAsync({ date: new Date(`${v.date}T12:00:00`).toISOString(), categorie: v.categorie, montantCentimes: parseEuros(v.montant)!, fournisseur: v.fournisseur, enveloppeId: v.enveloppeId || null, file });
      toast(original ? 'Écriture de correction créée. Elle remplacera l’originale une fois contrôlée.' : 'Dépense enregistrée : à contrôler par l’équipe financière.');
      onClose();
    } catch (e) {
      if (isApiError(e) && e.details) Object.entries(e.details).forEach(([k, msg]) => setFieldError((k === 'montantCentimes' ? 'montant' : k) as keyof Form, { message: msg }));
      setError(isApiError(e) ? e.message : 'L’enregistrement a échoué.');
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={original ? 'Corriger une écriture' : 'Saisir une dépense'}
      description={original ? 'L’écriture d’origine reste inchangée. Une écriture de correction, liée à elle, est créée et passe au contrôle.' : 'La dépense est enregistrée « à contrôler ».'}
      footer={<><Button variant="quiet" onClick={onClose}>Annuler</Button><Button type="submit" form="ecriture" loading={m.isPending}>{original ? 'Créer la correction' : 'Enregistrer'}</Button></>}
    >
      <form id="ecriture" onSubmit={submit} noValidate className="grid gap-4">
        {original ? <Notice icon="lock">Écriture d’origine : {original.categorie}, {original.fournisseur}, {euros(original.montantCentimes, { cents: true })} du {dateCourte(original.date)}{original.motifRejet ? ` (rejetée : ${original.motifRejet})` : ''}</Notice> : null}
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" error={errors.date?.message}><Input type="date" max={isoJour(new Date())} {...register('date')} /></Field>
          <Field label="Montant (€)" error={errors.montant?.message}><Input inputMode="decimal" placeholder="1 250,00" {...register('montant')} /></Field>
        </div>
        <Field label="Catégorie" error={errors.categorie?.message}>
          <Select {...register('categorie')}>
            <option value="">Choisir…</option>
            {CATEGORIES_ECRITURE.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Fournisseur" error={errors.fournisseur?.message}><Input {...register('fournisseur')} /></Field>
        <Field label="Enveloppe de la levée" optional hint="Seulement si la dépense est financée par les fonds levés." error={errors.enveloppeId?.message}>
          <Select {...register('enveloppeId')} disabled={!offre.data}>
            <option value="">Aucune (charge courante)</option>
            {offre.data?.enveloppes.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        <Field label="Justificatif" optional hint="PDF, JPG ou PNG, 10 Mo au plus." error={fileError ?? undefined}>
          <Input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="h-auto py-2.5 file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1 file:text-[13px] file:text-white" onChange={(e) => pick(e.target.files?.[0])} />
        </Field>
      </form>
    </Dialog>
  );
}

function ControleDialog({ actifId, ecriture: e, onClose }: { actifId: string; ecriture: Ecriture; onClose: () => void }) {
  const toast = useToast();
  const [motif, setMotif] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rejet, setRejet] = useState(false);
  const m = useActifMutation(actifId, (b: { decision: 'CONTROLEE' | 'REJETEE'; motif?: string }) => api.ecritures.controle(e.id, b));
  async function go(decision: 'CONTROLEE' | 'REJETEE') {
    setError(null);
    if (decision === 'REJETEE' && motif.trim().length < 5) { setError('Un motif de rejet est obligatoire (5 caractères au moins).'); return; }
    try {
      await m.mutateAsync({ decision, motif: decision === 'REJETEE' ? motif : undefined });
      toast(decision === 'CONTROLEE' ? 'Écriture contrôlée.' : 'Écriture rejetée. Le propriétaire voit le motif.');
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'L’action a échoué.');
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Contrôler l’écriture"
      description={`${e.categorie}, ${e.fournisseur}, ${euros(e.montantCentimes, { cents: true })} du ${dateCourte(e.date)}`}
      footer={rejet
        ? <><Button variant="quiet" onClick={() => setRejet(false)}>Retour</Button><Button variant="danger" loading={m.isPending} onClick={() => go('REJETEE')}>Rejeter l’écriture</Button></>
        : <><Button variant="danger" onClick={() => setRejet(true)}>Rejeter…</Button><Button loading={m.isPending} onClick={() => go('CONTROLEE')}>Marquer contrôlée</Button></>}
    >
      <div className="grid gap-4">
        <FormError message={error} />
        <p className="text-[14px]">Justificatif : {e.documentId && e.documentNom ? <DocLink id={e.documentId} nom={e.documentNom} /> : <Badge tone="wait">Manquant</Badge>}</p>
        {rejet ? <Field label="Motif du rejet" hint="Visible par le propriétaire."><Textarea value={motif} onChange={(x) => setMotif(x.target.value)} autoFocus /></Field> : null}
      </div>
    </Dialog>
  );
}
