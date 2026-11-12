import { isApiError } from '@/api/errors';
import { useInvestisseurs } from '@/api/hooks';
import { Notice, PageHeader, Section, Stat } from '@/components/common';
import { EmptyState, ErrorState, SkeletonBlock, SkeletonCards } from '@/components/states';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useActifCtx } from '@/layout/useActifCtx';
import { nombre, pourcent } from '@/lib/format';

export function InvestisseursPage() {
  const actif = useActifCtx();
  const q = useInvestisseurs(actif.id);
  return (
    <>
      <PageHeader title="Investisseurs" sub="Vue agrégée et pseudonymisée" donneesAu={q.dataUpdatedAt || null} />
      {q.isPending ? <><SkeletonCards n={3} /><div className="mt-6"><SkeletonBlock /></div></> : null}
      {q.isError ? (isApiError(q.error) && q.error.status === 404
        ? <EmptyState icon="users" title="Pas encore d’investisseurs">Cet actif n’a pas d’offre : aucune part n’a été souscrite.</EmptyState>
        : <ErrorState error={q.error} onRetry={() => q.refetch()} />) : null}
      {q.data ? (
        <div className="space-y-5">
          <Notice icon="shieldCheck">{q.data.avertissement}</Notice>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Investisseurs" value={nombre(q.data.nombre)} foot="Ayant au moins une part confirmée" />
            <Stat label="Parts confirmées" value={nombre(q.data.partsConfirmees)} />
            <Stat label="Premier porteur" value={pourcent(q.data.concentrations[0]?.pctParts ?? 0)} foot="Part des parts confirmées détenue par le plus gros investisseur" />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Section title="Répartition par tranche">
              <Table>
                <THead><TR><TH>Tranche</TH><TH num>Investisseurs</TH><TH num>Parts</TH><TH num>Part du total</TH></TR></THead>
                <TBody>
                  {q.data.tranches.map((t) => (
                    <TR key={t.libelle}>
                      <TD>{t.libelle}</TD>
                      <TD num>{nombre(t.investisseurs)}</TD>
                      <TD num>{nombre(t.parts)}</TD>
                      <TD num>
                        <span className="inline-flex items-center gap-2">
                          <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-2 sm:block"><span className="block h-full bg-ink" style={{ width: `${t.pctParts}%` }} /></span>
                          {pourcent(t.pctParts)}
                        </span>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Section>
            <Section title="Concentration" sub="Part des parts confirmées détenue par les plus gros porteurs">
              <ul className="space-y-3">
                {q.data.concentrations.map((c) => (
                  <li key={c.libelle}>
                    <div className="flex justify-between text-[14px]"><span>{c.libelle}</span><b className="tnum font-heading">{pourcent(c.pctParts)}</b></div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-ink" style={{ width: `${c.pctParts}%` }} /></div>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
          <Section title="Principaux porteurs" sub="Pseudonymes attribués par FRACT">
            <Table>
              <THead><TR><TH>Investisseur</TH><TH num>Parts</TH><TH num>Part du total</TH></TR></THead>
              <TBody>
                {q.data.principaux.map((p) => (
                  <TR key={p.ref}><TD className="font-medium">{p.ref}</TD><TD num>{nombre(p.parts)}</TD><TD num>{pourcent(p.pctParts)}</TD></TR>
                ))}
              </TBody>
            </Table>
          </Section>
        </div>
      ) : null}
    </>
  );
}
