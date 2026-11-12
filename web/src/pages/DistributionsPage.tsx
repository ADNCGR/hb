import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { isApiError } from '@/api/errors';
import { useDistributions } from '@/api/hooks';
import { Notice, PageHeader, Section } from '@/components/common';
import { EmptyState, Q, SkeletonBlock } from '@/components/states';
import { Spinner } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useActifCtx } from '@/layout/useActifCtx';
import { dateCourte, euros, parseEuros } from '@/lib/format';

export function DistributionsPage() {
  const actif = useActifCtx();
  const q = useDistributions(actif.id);
  return (
    <>
      <PageHeader title="Distributions" sub="Historique et simulation" donneesAu={q.dataUpdatedAt || null} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Section title="Historique" sub="Distributions déclarées après publication du rapport du trimestre">
          <Q query={q} skeleton={<SkeletonBlock rows={3} />} empty={(d) => d.length === 0 && <EmptyState icon="pie" title="Aucune distribution">Aucune distribution n’a encore été déclarée.</EmptyState>}>
            {(d) => (
              <Table>
                <THead><TR><TH>Période</TH><TH num>Montant distribuable</TH><TH num>Part des parts</TH><TH num>Attribué aux parts</TH><TH num>Par part</TH><TH>Déclarée le</TH></TR></THead>
                <TBody>
                  {d.map((x) => (
                    <TR key={x.id}>
                      <TD className="font-medium">{x.periode}</TD>
                      <TD num>{euros(x.montantDistribuableCentimes)}</TD>
                      <TD num>{x.pctParts} %</TD>
                      <TD num>{euros(x.montantAttribueCentimes)}</TD>
                      <TD num className="font-medium">{euros(x.parPartCentimes, { cents: true })}</TD>
                      <TD className="whitespace-nowrap">{dateCourte(x.declareeLe)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Q>
        </Section>
        <Simulateur actifId={actif.id} />
      </div>
    </>
  );
}

function Simulateur({ actifId }: { actifId: string }) {
  const [saisie, setSaisie] = useState('50 000');
  const m = useMutation({ mutationFn: (c: number) => api.distributions.simuler(actifId, c) });
  const { mutate } = m;
  const centimes = parseEuros(saisie);
  const invalide = saisie.trim() !== '' && (centimes === null || centimes <= 0);

  useEffect(() => {
    if (!centimes || centimes <= 0) return;
    const t = setTimeout(() => mutate(centimes), 350);
    return () => clearTimeout(t);
  }, [centimes, mutate]);

  const r = m.data;
  return (
    <Section title="Simulateur" sub="Calcul seulement : rien n’est enregistré">
      <div className="space-y-4">
        <Field label="Montant distribuable (€)" error={invalide ? 'Saisissez un montant positif.' : undefined} hint="Montant décidé après publication du rapport, avant application de la fraction.">
          <Input inputMode="decimal" value={saisie} onChange={(e) => setSaisie(e.target.value)} />
        </Field>
        {m.isError ? <Notice tone="bad" icon="alert">{isApiError(m.error) ? m.error.message : 'Simulation impossible.'}</Notice> : null}
        {r && !invalide ? (
          <div className="relative space-y-3" aria-live="polite">
            {m.isPending ? <Spinner className="absolute right-0 top-0 h-4 w-4 text-muted" /> : null}
            <dl className="space-y-2.5 text-[14px]">
              <div className="flex justify-between gap-3"><dt className="text-muted">Fraction proposée aux parts</dt><dd className="tnum font-medium">{r.pctParts} %</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Montant attribué aux parts</dt><dd className="tnum font-heading font-semibold">{euros(r.montantAttribueCentimes)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Nombre de parts</dt><dd className="tnum font-medium">{r.nbParts.toLocaleString('fr-FR')}</dd></div>
            </dl>
            <div className="rounded-row bg-surface p-4">
              <p className="kicker">Montant par part</p>
              <p className="tnum mt-1 font-heading text-[30px] font-semibold tracking-[-0.03em]">{euros(r.parPartCentimes, { cents: true })}</p>
              <p className="mt-1 text-[13.5px] text-muted">Exemple : un investisseur qui détient 10 parts recevrait <b className="tnum text-ink">{euros(r.exemple10PartsCentimes, { cents: true })}</b>.</p>
            </div>
            <p className="rounded-field border border-line px-3.5 py-2.5 font-mono text-[12.5px] leading-relaxed">{r.formule}</p>
            <p className="text-[13px] font-medium text-wait">{r.mention}</p>
          </div>
        ) : null}
      </div>
    </Section>
  );
}
