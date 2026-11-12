import { useMemo, useState } from 'react';
import { isApiError } from '@/api/errors';
import { useRegistre } from '@/api/hooks';
import type { StatutOperation } from '@/api/types';
import { Notice, OperationBadge, PageHeader, Pager, Section, Stat } from '@/components/common';
import { EmptyState, ErrorState, SkeletonBlock, SkeletonCards } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Chips } from '@/components/ui/chips';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useActifCtx } from '@/layout/useActifCtx';
import { court, dateHeure, nombre, TYPE_OPERATION } from '@/lib/format';
import { useToast } from '@/components/toast';
import { Icon } from '@/components/ui/Icon';

type Filtre = 'TOUT' | StatutOperation | 'A_RAPPROCHER';
const PAR_PAGE = 25;

export function RegistrePage() {
  const actif = useActifCtx();
  const q = useRegistre(actif.id);
  const [filtre, setFiltre] = useState<Filtre>('TOUT');
  const [page, setPage] = useState(1);
  const toast = useToast();
  const ops = useMemo(() => (q.data?.operations ?? []).filter((o) => filtre === 'TOUT' || (filtre === 'A_RAPPROCHER' ? o.aRapprocher : o.statut === filtre)), [q.data, filtre]);
  const pages = Math.max(1, Math.ceil(ops.length / PAR_PAGE));

  return (
    <>
      <PageHeader title="Registre des parts" sub="Opérations d’attribution des parts (réseau de test)" donneesAu={q.dataUpdatedAt || null} />
      {q.isPending ? <><SkeletonCards /><div className="mt-6"><SkeletonBlock rows={8} /></div></> : null}
      {q.isError ? (isApiError(q.error) && q.error.status === 404
        ? <EmptyState icon="ledger" title="Registre vide">Cet actif n’a pas d’offre : aucune opération de registre.</EmptyState>
        : <ErrorState error={q.error} onRetry={() => q.refetch()} />) : null}
      {q.data ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Opérations confirmées" value={nombre(q.data.resume.confirmees)} badge={<Badge tone="ok" dot>Parts attribuées</Badge>} />
            <Stat label="Opérations en attente" value={nombre(q.data.resume.enAttente)} badge={<Badge tone="wait" dot>Non comptées</Badge>} />
            <Stat label="Opérations échouées" value={nombre(q.data.resume.echouees)} badge={<Badge tone="bad" dot>Aucune part</Badge>} />
            <Stat label="À rapprocher" value={nombre(q.data.resume.aRapprocher)} foot="En attente depuis plus de 10 minutes" />
          </div>
          {q.data.resume.aRapprocher > 0 ? (
            <Notice tone="wait" icon="alert">
              {q.data.resume.aRapprocher > 1
                ? `${q.data.resume.aRapprocher} opérations sont en attente depuis plus de 10 minutes. L’équipe FRACT doit les rapprocher manuellement ; leurs parts ne comptent pas dans le capital.`
                : '1 opération est en attente depuis plus de 10 minutes. L’équipe FRACT doit la rapprocher manuellement ; ses parts ne comptent pas dans le capital.'}
            </Notice>
          ) : null}
          <Section title="Opérations" sub="Une opération confirmée attribue les parts ; en attente ou échouée, elle ne compte pas.">
            <Chips<Filtre>
              label="Filtrer par statut"
              value={filtre}
              onChange={(v) => { setFiltre(v); setPage(1); }}
              options={[
                { value: 'TOUT', label: 'Toutes', count: q.data.operations.length },
                { value: 'CONFIRMEE', label: 'Confirmées', count: q.data.resume.confirmees },
                { value: 'EN_ATTENTE', label: 'En attente', count: q.data.resume.enAttente },
                { value: 'ECHOUEE', label: 'Échouées', count: q.data.resume.echouees },
                { value: 'A_RAPPROCHER', label: 'À rapprocher', count: q.data.resume.aRapprocher },
              ]}
            />
            <div className="mt-4">
              {ops.length ? (
                <>
                  <Table>
                    <THead><TR><TH>Envoyée le</TH><TH>Investisseur</TH><TH>Type</TH><TH num>Parts</TH><TH>txHash</TH><TH num>Confirmations</TH><TH>Statut</TH></TR></THead>
                    <TBody>
                      {ops.slice((page - 1) * PAR_PAGE, page * PAR_PAGE).map((o) => (
                        <TR key={o.id}>
                          <TD className="whitespace-nowrap">{dateHeure(o.envoyeeLe)}</TD>
                          <TD className="whitespace-nowrap">{o.investisseurRef}</TD>
                          <TD>{TYPE_OPERATION[o.type]}</TD>
                          <TD num>{nombre(o.quantite)}</TD>
                          <TD>
                            <button
                              className="inline-flex items-center gap-1.5 font-mono text-[12.5px] text-muted hover:text-ink"
                              title={o.txHash}
                              aria-label={`Copier le txHash ${o.txHash}`}
                              onClick={() => { void navigator.clipboard?.writeText(o.txHash); toast('txHash copié.'); }}
                            >
                              {court(o.txHash, 10)}<Icon name="file" className="h-3.5 w-3.5" />
                            </button>
                          </TD>
                          <TD num>{o.confirmations}</TD>
                          <TD><span className="flex flex-wrap gap-1.5"><OperationBadge s={o.statut} />{o.aRapprocher ? <Badge tone="line">À rapprocher</Badge> : null}</span></TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                  <Pager page={page} pages={pages} total={ops.length} onPage={setPage} unit="opérations" />
                </>
              ) : <EmptyState icon="ledger" title="Aucune opération pour ce filtre" />}
            </div>
          </Section>
        </div>
      ) : null}
    </>
  );
}
