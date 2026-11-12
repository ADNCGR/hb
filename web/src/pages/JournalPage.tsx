import { useState } from 'react';
import { useJournal } from '@/api/hooks';
import { PageHeader, Pager, Section } from '@/components/common';
import { EmptyState, Q, SkeletonBlock } from '@/components/states';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useActifCtx } from '@/layout/useActifCtx';
import { cn } from '@/lib/cn';
import { ACTION_JOURNAL, dateHeure } from '@/lib/format';

export function JournalPage() {
  const actif = useActifCtx();
  const [page, setPage] = useState(1);
  const q = useJournal(actif.id, page);
  return (
    <>
      <PageHeader title="Journal" sub="Historique des modifications de l’actif" donneesAu={q.dataUpdatedAt || null} />
      <Section title="Événements">
        <Q query={q} skeleton={<SkeletonBlock rows={10} />} empty={(d) => d.total === 0 && <EmptyState icon="history" title="Journal vide" />}>
          {(d) => (
            <div className={cn(q.isPlaceholderData && 'opacity-60')}>
              <Table>
                <THead><TR><TH>Date</TH><TH>Auteur</TH><TH>Action</TH><TH>Objet</TH></TR></THead>
                <TBody>
                  {d.items.map((j) => (
                    <TR key={j.id}>
                      <TD className="whitespace-nowrap">{dateHeure(j.le)}</TD>
                      <TD className="whitespace-nowrap">{j.auteurNom}</TD>
                      <TD className="whitespace-nowrap font-medium">{ACTION_JOURNAL[j.action] ?? j.action}</TD>
                      <TD className="text-muted">{j.objet}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <Pager page={d.page} pages={d.pages} total={d.total} onPage={setPage} unit="événements" />
            </div>
          )}
        </Q>
      </Section>
    </>
  );
}
