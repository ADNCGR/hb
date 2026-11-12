import { useAcces } from '@/api/hooks';
import { PageHeader, Section } from '@/components/common';
import { EmptyState, Q, SkeletonBlock } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useActifCtx } from '@/layout/useActifCtx';
import { dateCourte, ROLE } from '@/lib/format';

const ROLE_DESC: Record<string, string> = {
  PROPRIETAIRE: 'Saisit charges et documents, répond aux demandes de pièces, importe des ventes.',
  OPERATEUR_CAISSE: 'Envoie les ventes de sa caisse, rien d’autre.',
  FINANCE_AUTEUR: 'Rédige et soumet les rapports, contrôle les écritures.',
  FINANCE_VERIFICATEUR: 'Valide ou refuse les rapports d’un autre auteur, contrôle les écritures.',
  FINANCE_PUBLICATION: 'Publie les rapports validés.',
  ADMIN: 'Tous les droits.',
};

export function AccesPage() {
  const actif = useActifCtx();
  const q = useAcces(actif.id);
  return (
    <>
      <PageHeader title="Accès" sub="Consultation uniquement. Pour modifier un accès, contactez l’équipe FRACT." donneesAu={q.dataUpdatedAt || null} />
      <div className="space-y-5">
        <Section title="Comptes ayant accès">
          <Q query={q} skeleton={<SkeletonBlock rows={5} />} empty={(d) => d.length === 0 && <EmptyState icon="key" title="Aucun accès" />}>
            {(d) => (
              <Table>
                <THead><TR><TH>Compte</TH><TH>Rôle</TH><TH>Ce que permet ce rôle</TH><TH>Depuis</TH></TR></THead>
                <TBody>
                  {d.map((a) => (
                    <TR key={a.id}>
                      <TD><b className="block font-medium">{a.compteNom}</b><span className="text-[13px] text-muted">{a.compteEmail}</span></TD>
                      <TD><Badge tone={a.role === 'PROPRIETAIRE' ? 'ink' : 'neutral'}>{ROLE[a.role]}</Badge>{a.caisseNom ? <span className="mt-1 block text-[12.5px] text-muted">{a.caisseNom}</span> : null}</TD>
                      <TD className="max-w-[360px] text-[13.5px] text-muted">{ROLE_DESC[a.role]}</TD>
                      <TD className="whitespace-nowrap">{dateCourte(a.depuis)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Q>
        </Section>
      </div>
    </>
  );
}
