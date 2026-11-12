import { useMemo, useState } from 'react';
import { api } from '@/api/client';
import { CATEGORIES_DOCUMENT, FORMATS_DOCUMENT, TAILLE_MAX_DOCUMENT } from '@/api/constants';
import { isApiError } from '@/api/errors';
import { useActifMutation, useDemandes, useDocuments } from '@/api/hooks';
import type { DemandePiece, DocumentFichier } from '@/api/types';
import { useRoles } from '@/auth/AuthContext';
import { DemandeBadge, Notice, PageHeader, Pager, Section } from '@/components/common';
import { DocLink } from '@/components/DocLink';
import { EmptyState, Q, SkeletonBlock } from '@/components/states';
import { useToast } from '@/components/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Dialog } from '@/components/ui/dialog';
import { Field, FormError, Select } from '@/components/ui/form';
import { Icon } from '@/components/ui/Icon';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useActifCtx } from '@/layout/useActifCtx';
import { dateCourte, dateHeure, taille } from '@/lib/format';

const PAR_PAGE = 20;

export function DocumentsPage() {
  const actif = useActifCtx();
  const { isOwner, isFinance } = useRoles(actif.id);
  const docs = useDocuments(actif.id);
  const demandes = useDemandes(actif.id);
  const [uploading, setUploading] = useState(false);
  const [answering, setAnswering] = useState<DemandePiece | null>(null);
  const [cat, setCat] = useState('TOUT');
  const [page, setPage] = useState(1);
  const rows = useMemo(() => (docs.data ?? []).filter((d) => cat === 'TOUT' || d.categorie === cat), [docs.data, cat]);
  const cats = useMemo(() => [...new Set((docs.data ?? []).map((d) => d.categorie))].sort(), [docs.data]);

  return (
    <>
      <PageHeader
        title="Documents"
        sub="Factures, contrats et justificatifs de l’actif"
        donneesAu={docs.dataUpdatedAt || null}
        actions={isOwner || isFinance ? <Button dot onClick={() => setUploading(true)}>Déposer un document</Button> : null}
      />
      <div className="space-y-5">
        <Section title="Demandes de pièces" sub="Pièces demandées par l’équipe financière">
          <Q query={demandes} skeleton={<SkeletonBlock rows={3} />} empty={(d) => d.length === 0 && <EmptyState icon="check" title="Aucune demande">L’équipe financière n’a demandé aucune pièce.</EmptyState>}>
            {(d) => (
              <ul className="grid gap-2">
                {d.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-row border border-line px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-heading text-[14.5px] font-semibold">{x.objet}</p>
                      <p className="text-[13px] text-muted">
                        Demandée par {x.demandeurNom} le {dateCourte(x.creeLe)}
                        {x.statut === 'OUVERTE' ? <>, à fournir avant le <b className="font-medium text-ink">{dateCourte(x.echeance)}</b></> : null}
                      </p>
                      {x.documentId && x.documentNom ? <div className="mt-1"><DocLink id={x.documentId} nom={x.documentNom} /></div> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <DemandeBadge s={x.statut} />
                      {isOwner && x.statut === 'OUVERTE' ? <Button size="sm" onClick={() => setAnswering(x)}>Répondre</Button> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Q>
        </Section>
        <Section title="Tous les documents">
          <Q query={docs} skeleton={<SkeletonBlock rows={8} />} empty={(d) => d.length === 0 && <EmptyState icon="folder" title="Aucun document">Les factures, contrats et relevés déposés apparaîtront ici.</EmptyState>}>
            {() => (
              <div className="space-y-4">
                <Chips label="Filtrer par catégorie" value={cat} onChange={(v) => { setCat(v); setPage(1); }} options={[{ value: 'TOUT', label: 'Tous', count: docs.data!.length }, ...cats.map((c) => ({ value: c, label: c, count: docs.data!.filter((d) => d.categorie === c).length }))]} />
                <Table>
                  <THead><TR><TH>Nom</TH><TH>Catégorie</TH><TH>Lié à</TH><TH>Déposé</TH><TH num>Taille</TH></TR></THead>
                  <TBody>
                    {rows.slice((page - 1) * PAR_PAGE, page * PAR_PAGE).map((d) => (
                      <TR key={d.id}>
                        <TD className="max-w-[340px]"><DocLink id={d.id} nom={d.nom} /></TD>
                        <TD><Badge>{d.categorie}</Badge></TD>
                        <TD className="text-[13.5px] text-muted">{d.ecritureId ? 'Écriture' : d.rapportId ? 'Rapport' : '-'}</TD>
                        <TD className="whitespace-nowrap text-[13.5px]">{dateHeure(d.deposeLe)}<span className="block text-muted">{d.auteurNom}</span></TD>
                        <TD num className="text-muted">{taille(d.taille)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <Pager page={page} pages={Math.max(1, Math.ceil(rows.length / PAR_PAGE))} total={rows.length} onPage={setPage} unit="documents" />
              </div>
            )}
          </Q>
        </Section>
      </div>
      {uploading ? <UploadDialog actifId={actif.id} onClose={() => setUploading(false)} /> : null}
      {answering ? <UploadDialog actifId={actif.id} demande={answering} existing={docs.data ?? []} onClose={() => setAnswering(null)} /> : null}
    </>
  );
}

function UploadDialog({ actifId, demande, existing = [], onClose }: { actifId: string; demande?: DemandePiece; existing?: DocumentFichier[]; onClose: () => void }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [categorie, setCategorie] = useState(demande ? (demande.ecritureId ? 'Facture' : 'Banque') : '');
  const [mode, setMode] = useState<'nouveau' | 'existant'>('nouveau');
  const [docId, setDocId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const m = useActifMutation(actifId, async () => {
    let id = docId;
    if (mode === 'nouveau') id = (await api.documents.deposer(actifId, file!, categorie, demande?.ecritureId)).id;
    if (demande) await api.documents.repondre(demande.id, id);
  });

  function pick(f: File | undefined) {
    setError(null);
    setFile(null);
    if (!f) return;
    if (!(FORMATS_DOCUMENT as readonly string[]).includes(f.type)) { setError('Format refusé : seuls les PDF, JPG et PNG sont acceptés.'); return; }
    if (f.size > TAILLE_MAX_DOCUMENT) { setError('Le fichier dépasse la taille maximale de 10 Mo.'); return; }
    setFile(f);
  }

  async function submit() {
    setError(null);
    if (mode === 'nouveau' && !file) { setError('Choisissez un fichier.'); return; }
    if (mode === 'nouveau' && !categorie) { setError('Choisissez une catégorie.'); return; }
    if (mode === 'existant' && !docId) { setError('Choisissez un document.'); return; }
    try {
      await m.mutateAsync();
      toast(demande ? 'Pièce envoyée : la demande est marquée répondue.' : 'Document déposé.');
      onClose();
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Le dépôt a échoué.');
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={demande ? 'Répondre à une demande' : 'Déposer un document'}
      description={demande ? demande.objet : 'Seuls les comptes ayant accès à cet actif pourront le consulter.'}
      footer={<><Button variant="quiet" onClick={onClose}>Annuler</Button><Button loading={m.isPending} onClick={submit}>{demande ? 'Envoyer la pièce' : 'Déposer'}</Button></>}
    >
      <div className="grid gap-4">
        <FormError message={error} />
        {demande ? (
          <Chips<'nouveau' | 'existant'> label="Source de la pièce" value={mode} onChange={setMode} options={[{ value: 'nouveau', label: 'Nouveau fichier' }, { value: 'existant', label: 'Document déjà déposé' }]} />
        ) : null}
        {mode === 'nouveau' ? (
          <>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed border-line-2 bg-surface px-6 py-8 text-center hover:border-black/40 focus-within:outline focus-within:outline-2 focus-within:outline-ink">
              <Icon name="upload" className="h-6 w-6 text-muted" />
              <span className="font-heading text-[14.5px] font-medium">{file ? file.name : 'Choisir un fichier'}</span>
              <span className="text-[13px] text-muted">{file ? taille(file.size) : 'PDF, JPG ou PNG, 10 Mo au plus'}</span>
              <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            <Field label="Catégorie">
              <Select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                <option value="">Choisir…</option>
                {CATEGORIES_DOCUMENT.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </>
        ) : (
          <Field label="Document">
            <Select value={docId} onChange={(e) => setDocId(e.target.value)}>
              <option value="">Choisir…</option>
              {existing.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </Select>
          </Field>
        )}
        {demande?.ecritureId ? <Notice icon="info">Le fichier sera aussi joint à l’écriture concernée comme justificatif.</Notice> : null}
      </div>
    </Dialog>
  );
}
