import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { isApiError } from '@/api/errors';
import { useActifMutation, useCaisses, useConflits, useVentes } from '@/api/hooks';
import type { BilanImport, Caisse, ConflitVente, VenteContenu } from '@/api/types';
import { useRoles } from '@/auth/AuthContext';
import { Notice, PageHeader, Pager, Section } from '@/components/common';
import { EmptyState, Q, SkeletonBlock } from '@/components/states';
import { useToast } from '@/components/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input, Select } from '@/components/ui/form';
import { Icon } from '@/components/ui/Icon';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActifCtx } from '@/layout/useActifCtx';
import { cn } from '@/lib/cn';
import { court, dateHeure, euros, ilYa, MOYEN, nombre } from '@/lib/format';

export function VentesPage() {
  const actif = useActifCtx();
  const caisses = useCaisses(actif.id);
  const conflits = useConflits(actif.id);
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('onglet') ?? 'ventes';
  return (
    <>
      <PageHeader title="Ventes et caisses" sub={actif.nom} donneesAu={caisses.dataUpdatedAt || null} />
      <Q query={caisses} skeleton={<SkeletonBlock rows={3} />}>
        {(cs) => (cs.length ? <CaissesBlock caisses={cs} /> : <EmptyState icon="card" title="Aucune caisse">Aucune caisse n’est reliée à cet actif. Les ventes arrivent par l’application de caisse ou par import CSV.</EmptyState>)}
      </Q>
      <Tabs value={tab} onValueChange={(v) => setSp((p) => { p.set('onglet', v); return p; }, { replace: true })} className="mt-8">
        <TabsList aria-label="Sections des ventes">
          <TabsTrigger value="ventes">Ventes</TabsTrigger>
          <TabsTrigger value="conflits">Conflits{conflits.data?.length ? <Badge tone="bad" className="ml-2">{conflits.data.length}</Badge> : null}</TabsTrigger>
          <TabsTrigger value="import">Import CSV</TabsTrigger>
        </TabsList>
        <TabsContent value="ventes"><VentesList actifId={actif.id} caisses={caisses.data ?? []} /></TabsContent>
        <TabsContent value="conflits">
          <Q query={conflits} skeleton={<SkeletonBlock />} empty={(d) => d.length === 0 && <EmptyState icon="check" title="Aucun conflit">Aucune vente n’a été renvoyée avec un contenu différent.</EmptyState>}>
            {(d) => <ConflitsList conflits={d} />}
          </Q>
        </TabsContent>
        <TabsContent value="import"><ImportCsv actifId={actif.id} caisses={caisses.data ?? []} /></TabsContent>
      </Tabs>
    </>
  );
}

function CaissesBlock({ caisses }: { caisses: Caisse[] }) {
  const late = caisses.filter((c) => c.enRetard);
  return (
    <div className="space-y-3">
      {late.map((c) => (
        <Notice key={c.id} tone="bad" icon="wifiOff">
          <b>{c.nom}</b> n’a pas synchronisé depuis {c.heuresDepuisSync !== null ? `${Math.floor(c.heuresDepuisSync)} h` : 'sa mise en service'}. Les ventes de cette caisse peuvent manquer : vérifiez sa connexion.
        </Notice>
      ))}
      <ul className="grid gap-3 md:grid-cols-2">
        {caisses.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-4 rounded-card border border-line p-5">
            <div className="min-w-0">
              <p className="font-heading text-[16px] font-semibold">{c.nom}</p>
              <p className="text-[13px] text-muted">{c.appareil}</p>
              <p className="mt-3 text-[14px]">
                Dernière synchro : {c.derniereSyncLe ? <><b className="font-medium">{dateHeure(c.derniereSyncLe)}</b> <span className="text-muted">({ilYa(c.derniereSyncLe)})</span></> : 'jamais'}
              </p>
              <p className="text-[13.5px] text-muted">{nombre(c.ventesAujourdhui)} vente{c.ventesAujourdhui > 1 ? 's' : ''} aujourd’hui</p>
            </div>
            {c.enRetard ? <Badge tone="bad" dot>Plus de 24 h</Badge> : <Badge tone="ok" dot>À jour</Badge>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function VentesList({ actifId, caisses }: { actifId: string; caisses: Caisse[] }) {
  const [f, setF] = useState({ debut: '', fin: '', caisseId: '' });
  const [page, setPage] = useState(1);
  const q = useVentes(actifId, { ...f, page });
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setPage(1); };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[180px_180px_220px_auto] lg:items-end">
        <Field label="Du"><Input type="date" value={f.debut} max={f.fin || undefined} onChange={(e) => set('debut', e.target.value)} /></Field>
        <Field label="Au"><Input type="date" value={f.fin} min={f.debut || undefined} onChange={(e) => set('fin', e.target.value)} /></Field>
        <Field label="Caisse">
          <Select value={f.caisseId} onChange={(e) => set('caisseId', e.target.value)}>
            <option value="">Toutes les caisses</option>
            {caisses.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </Select>
        </Field>
        {f.debut || f.fin || f.caisseId ? <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => { setF({ debut: '', fin: '', caisseId: '' }); setPage(1); }}>Effacer les filtres</Button> : null}
      </div>
      <Q query={q} skeleton={<SkeletonBlock rows={8} />} empty={(d) => d.total === 0 && <EmptyState icon="search" title="Aucune vente">Aucune vente ne correspond à ces filtres.</EmptyState>}>
        {(d) => (
          <div className={cn('transition-opacity', q.isPlaceholderData && 'opacity-60')}>
            <p className="mb-3 text-[14px]">Total de la sélection : <b className="tnum font-heading">{euros(d.totalMontantCentimes)}</b> <span className="text-muted">({nombre(d.total)} ventes)</span></p>
            <Table>
              <THead><TR><TH>Date de vente</TH><TH>Caisse</TH><TH>Identifiant (UUID)</TH><TH>Paiement</TH><TH>Reçue le</TH><TH num>Montant</TH></TR></THead>
              <TBody>
                {d.items.map((v) => (
                  <TR key={v.id}>
                    <TD className="whitespace-nowrap">{dateHeure(v.dateVente)}</TD>
                    <TD className="whitespace-nowrap">{v.caisseNom}</TD>
                    <TD className="font-mono text-[12.5px] text-muted" title={v.venteUuid}>{court(v.venteUuid, 8)}</TD>
                    <TD>{MOYEN[v.moyenPaiement]}</TD>
                    <TD className="whitespace-nowrap text-muted">{dateHeure(v.recueLe)}</TD>
                    <TD num className="font-medium">{euros(v.montantCentimes, { cents: true })}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pager page={d.page} pages={d.pages} total={d.total} onPage={setPage} unit="ventes" />
          </div>
        )}
      </Q>
    </div>
  );
}

const CHAMPS: [keyof VenteContenu, string][] = [['dateVente', 'Date de vente'], ['montantCentimes', 'Montant'], ['moyenPaiement', 'Paiement']];
const valeur = (k: keyof VenteContenu, v: VenteContenu) => (k === 'dateVente' ? dateHeure(v.dateVente) : k === 'montantCentimes' ? euros(v.montantCentimes, { cents: true }) : k === 'moyenPaiement' ? MOYEN[v.moyenPaiement] : v[k]);

function ConflitsList({ conflits }: { conflits: ConflitVente[] }) {
  return (
    <div className="space-y-4">
      <Notice icon="info">Ces ventes ont été renvoyées par une caisse avec un contenu différent de la vente déjà enregistrée. La vente d’origine n’a pas été modifiée.</Notice>
      {conflits.map((c) => (
        <article key={c.id} className="rounded-card border border-line p-5">
          <header className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-[15.5px]">{c.caisseNom}, vente <span className="font-mono text-[13.5px] font-normal">{c.venteUuid}</span></h3>
              <p className="text-[13.5px] text-muted">Reçu le {dateHeure(c.recuLe)}</p>
            </div>
            <Badge tone="bad" dot>Conflit</Badge>
          </header>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {([['Vente enregistrée (inchangée)', c.venteExistante], ['Contenu reçu (refusé)', c.contenuRecu]] as const).map(([titre, v]) => (
              <div key={titre} className="rounded-row bg-surface p-4">
                <p className="font-heading text-[13.5px] font-semibold">{titre}</p>
                {v ? (
                  <dl className="mt-2 space-y-1.5 text-[14px]">
                    {CHAMPS.map(([k, label]) => (
                      <div key={k} className={cn('flex justify-between gap-3 rounded-md px-2 py-1', c.differences.includes(k) && 'bg-bad-soft text-bad')}>
                        <dt className={c.differences.includes(k) ? '' : 'text-muted'}>{label}</dt>
                        <dd className="tnum font-medium">{valeur(k, v)}{c.differences.includes(k) ? <span className="sr-only"> (différent)</span> : null}</dd>
                      </div>
                    ))}
                  </dl>
                ) : <p className="mt-2 text-[14px] text-muted">Vente introuvable.</p>}
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function ImportCsv({ actifId, caisses }: { actifId: string; caisses: Caisse[] }) {
  const { isOwner } = useRoles(actifId);
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [lignes, setLignes] = useState(0);
  const [bilan, setBilan] = useState<BilanImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const m = useActifMutation(actifId, (f: File) => api.ventes.importer(actifId, f));

  async function choose(f: File | undefined) {
    setBilan(null);
    setError(null);
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) { setError('Choisissez un fichier .csv.'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('Le fichier dépasse 10 Mo.'); return; }
    const rows = (await f.text()).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(',').map((x) => x.trim()));
    setFile(f);
    setLignes(Math.max(0, rows.length - 1));
    setPreview(rows.slice(0, 11));
  }

  async function send() {
    if (!file) return;
    setError(null);
    try {
      const b = await m.mutateAsync(file);
      setBilan(b);
      toast(`Import terminé : ${b.creees} vente${b.creees > 1 ? 's' : ''} créée${b.creees > 1 ? 's' : ''}.`);
    } catch (e) {
      setError(isApiError(e) ? e.message : 'L’import a échoué.');
    }
  }

  function modele() {
    const ids = caisses.map((c) => c.id);
    const rows = [
      'caisse_id,vente_uuid,date,montant,moyen_paiement',
      `${ids[0] ?? 'cai_comptoir'},6f1c2a10-4b7e-4c1a-9d2e-0a1b2c3d4e01,2026-11-10T10:12:00Z,42.50,CARTE`,
      `${ids[0] ?? 'cai_comptoir'},6f1c2a10-4b7e-4c1a-9d2e-0a1b2c3d4e02,2026-11-10T11:40:00Z,18.90,ESPECES`,
      `${ids[1] ?? ids[0] ?? 'cai_entree'},6f1c2a10-4b7e-4c1a-9d2e-0a1b2c3d4e03,2026-11-10T15:05:00Z,126.00,CARTE`,
      `${ids[1] ?? ids[0] ?? 'cai_entree'},6f1c2a10-4b7e-4c1a-9d2e-0a1b2c3d4e04,2026-11-10T17:22:00Z,9.99,AUTRE`,
    ];
    const url = URL.createObjectURL(new Blob([`${rows.join('\n')}\n`], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'modele-import-ventes.csv' });
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!isOwner) return <EmptyState icon="lock" title="Réservé au propriétaire">Seul le propriétaire de l’actif peut importer des ventes.</EmptyState>;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Section title="Importer un fichier" sub="Colonnes : caisse_id, vente_uuid, date, montant, moyen_paiement">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" id="csv" onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ''; }} />
            <Button variant="quiet" onClick={() => input.current?.click()}><Icon name="upload" className="h-4 w-4" />Choisir un fichier CSV</Button>
            <Button variant="ghost" onClick={modele}><Icon name="download" className="h-4 w-4" />Télécharger un modèle</Button>
          </div>
          <FormError message={error} />
          {preview ? (
            <>
              <p className="text-[14px]"><b className="font-medium">{file?.name}</b> <span className="text-muted">({nombre(lignes)} ligne{lignes > 1 ? 's' : ''}, aperçu des 10 premières)</span></p>
              <div className="rounded-row border border-line p-3">
                <Table>
                  <THead><TR>{preview[0].map((h, i) => <TH key={i}>{h}</TH>)}</TR></THead>
                  <TBody>{preview.slice(1).map((r, i) => <TR key={i}>{r.map((c, j) => <TD key={j} className="whitespace-nowrap font-mono text-[12.5px]">{c}</TD>)}</TR>)}</TBody>
                </Table>
              </div>
              <Button onClick={send} loading={m.isPending}>Importer {nombre(lignes)} ligne{lignes > 1 ? 's' : ''}</Button>
            </>
          ) : <p className="text-[14px] text-muted">Un aperçu s’affiche avant l’import. Les ventes déjà enregistrées ne sont pas importées une deuxième fois.</p>}
        </div>
      </Section>
      <Section title="Bilan" sub={bilan ? `${nombre(bilan.lignes)} lignes traitées` : 'Après l’import'}>
        {bilan ? (
          <div className="space-y-3">
            <ul className="grid grid-cols-2 gap-2">
              {([['Créées', bilan.creees, 'ok'], ['Déjà présentes', bilan.dejaPresentes, 'neutral'], ['Conflits', bilan.conflits, 'bad'], ['Invalides', bilan.invalides.length, 'wait']] as const).map(([l, n, t]) => (
                <li key={l} className="rounded-row bg-surface p-3"><Badge tone={t}>{l}</Badge><p className="tnum mt-1.5 font-heading text-[22px] font-semibold">{nombre(n)}</p></li>
              ))}
            </ul>
            {bilan.invalides.length ? (
              <ul className="space-y-1 text-[13.5px]">
                {bilan.invalides.slice(0, 20).map((x) => <li key={x.ligne}><b className="font-medium">Ligne {x.ligne}</b> : <span className="text-muted">{x.erreur}</span></li>)}
              </ul>
            ) : null}
          </div>
        ) : <p className="text-[14px] text-muted">Le bilan indique les ventes créées, déjà présentes, en conflit et les lignes invalides.</p>}
      </Section>
    </div>
  );
}
