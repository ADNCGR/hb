import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTableauDeBord } from '@/api/hooks';
import type { TableauDeBord } from '@/api/types';
import { PageHeader, RapportBadge, Section, Stat } from '@/components/common';
import { Q, SkeletonBlock, SkeletonCards } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useActifCtx } from '@/layout/useActifCtx';
import { dateCourte, dateHeure, euros, eurosArrondis, ilYa, moisCourt, moisLong, nombre, STATUT_ACTIF, STATUT_OFFRE } from '@/lib/format';

export function DashboardPage() {
  const actif = useActifCtx();
  const q = useTableauDeBord(actif.id);
  return (
    <>
      <PageHeader title={actif.nom} sub={`${STATUT_ACTIF[actif.statut]}, ${actif.ville}`} donneesAu={q.data?.donneesAu} />
      <Q query={q} skeleton={<><SkeletonCards /><div className="mt-6"><SkeletonBlock rows={6} /></div></>}>
        {(d) => <Dashboard d={d} actifId={actif.id} />}
      </Q>
    </>
  );
}

function Dashboard({ d, actifId }: { d: TableauDeBord; actifId: string }) {
  const base = `/actifs/${actifId}`;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={`Chiffre d’affaires ${d.trimestre}`} value={euros(d.caTrimestreCentimes)} foot="Ventes reçues des caisses, trimestre en cours" />
        <Stat label={`Charges ${d.trimestre}`} value={euros(d.chargesTrimestreCentimes)} foot="Écritures saisies, hors usage des fonds levés" />
        <Stat
          label="Résultat provisoire"
          value={euros(d.resultatProvisoireCentimes)}
          tone={d.resultatProvisoireCentimes < 0 ? 'bad' : undefined}
          badge={<Badge tone="wait">Non validé</Badge>}
          foot="CA moins charges, avant contrôle de l’équipe financière"
        />
        <Stat label="Trésorerie déclarée" value={euros(d.tresorerieDeclareeCentimes)} foot={d.tresorerieSource ?? 'Aucun rapport publié'} />
      </div>

      <Section title="Chiffre d’affaires et charges" sub="12 derniers mois, en euros (le mois en cours est partiel)">
        <Chart d={d} />
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Levée" action={<Link to={`${base}/levee`} className="text-[13.5px] text-muted underline decoration-black/30 underline-offset-[3px] hover:text-ink">Voir la levée</Link>}>
          {d.levee ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="tnum font-heading text-[26px] font-semibold tracking-[-0.03em]">{euros(d.levee.capitalConfirmeCentimes)}</p>
                <p className="text-[13.5px] text-muted">capital confirmé sur {euros(d.levee.objectifCentimes)} (offre {STATUT_OFFRE[d.levee.statutOffre!].toLowerCase()})</p>
              </div>
              <PartsBar confirmees={d.levee.partsConfirmees} enAttente={d.levee.partsEnAttente} total={d.levee.nbParts} />
              <ul className="grid grid-cols-3 gap-2 text-[13.5px]">
                <li><Badge tone="ok" dot>Confirmées</Badge><p className="tnum mt-1.5 font-heading text-[18px] font-semibold">{nombre(d.levee.partsConfirmees)}</p></li>
                <li><Badge tone="wait" dot>En attente</Badge><p className="tnum mt-1.5 font-heading text-[18px] font-semibold">{nombre(d.levee.partsEnAttente)}</p></li>
                <li><Badge tone="bad" dot>Échouées</Badge><p className="tnum mt-1.5 font-heading text-[18px] font-semibold">{nombre(d.levee.partsEchouees)}</p></li>
              </ul>
              <p className="text-[13px] text-muted">Les parts en attente ou échouées ne sont pas comptées dans le capital.</p>
            </div>
          ) : (
            <p className="text-[14px] text-muted">Pas encore d’offre pour cet actif. <Link to={`${base}/levee`} className="text-ink underline underline-offset-[3px]">Préparer l’offre</Link></p>
          )}
        </Section>

        <Section title="Rapports" action={<Link to={`${base}/rapports`} className="text-[13.5px] text-muted underline decoration-black/30 underline-offset-[3px] hover:text-ink">Tous les rapports</Link>}>
          <div className="grid gap-3">
            <RapportRow label="Dernier rapport publié" r={d.dernierRapportPublie} base={base} />
            <RapportRow label="Rapport en cours" r={d.rapportEnCours} base={base} />
          </div>
        </Section>

        <Section title="Caisses" sub="Dernière synchronisation de chaque caisse" action={<Link to={`${base}/ventes`} className="text-[13.5px] text-muted underline decoration-black/30 underline-offset-[3px] hover:text-ink">Ventes</Link>}>
          {d.caisses.length ? (
            <ul className="grid gap-2">
              {d.caisses.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-row border border-line px-4 py-3">
                  <span className="min-w-0">
                    <b className="block font-heading text-[14.5px] font-semibold">{c.nom}</b>
                    <small className="block text-[13px] text-muted">{c.derniereSyncLe ? `${dateHeure(c.derniereSyncLe)} (${ilYa(c.derniereSyncLe)})` : 'Jamais synchronisée'}</small>
                  </span>
                  {c.enRetard ? <Badge tone="bad" dot>Plus de 24 h</Badge> : <Badge tone="ok" dot>À jour</Badge>}
                </li>
              ))}
            </ul>
          ) : <p className="text-[14px] text-muted">Aucune caisse reliée à cet actif.</p>}
        </Section>

        <Section title="Échéances" sub="Dans les 60 prochains jours">
          {d.echeances.length ? (
            <ul className="divide-y divide-line">
              {d.echeances.map((e, i) => (
                <li key={i} className="flex items-start gap-4 py-2.5 first:pt-0 last:pb-0">
                  <span className="tnum w-[92px] flex-none font-heading text-[13.5px] font-semibold">{dateCourte(e.date)}</span>
                  <span className="min-w-0 flex-1 text-[14px]">
                    {e.lien ? <Link to={`${base}/${e.lien}`} className="hover:underline hover:underline-offset-[3px]">{e.libelle}</Link> : e.libelle}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-[14px] text-muted">Aucune échéance dans les 60 jours.</p>}
        </Section>
      </div>
    </div>
  );
}

function RapportRow({ label, r, base }: { label: string; r: TableauDeBord['dernierRapportPublie']; base: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-row border border-line px-4 py-3">
      <span className="min-w-0">
        <small className="block text-[12.5px] text-muted">{label}</small>
        {r ? (
          <Link to={`${base}/rapports/${r.id}`} className="font-heading text-[15px] font-semibold hover:underline hover:underline-offset-[3px]">
            {r.periode} <span className="font-normal text-muted">version {r.version}</span>
          </Link>
        ) : <b className="font-heading text-[15px] font-semibold text-muted">Aucun</b>}
        {r?.publieLe ? <small className="block text-[12.5px] text-muted">Publié le {dateCourte(r.publieLe)}</small> : null}
      </span>
      {r ? <RapportBadge s={r.statut} /> : null}
    </div>
  );
}

export function PartsBar({ confirmees, enAttente, total }: { confirmees: number; enAttente: number; total: number }) {
  const pc = (n: number) => `${Math.min(100, (n / Math.max(total, 1)) * 100)}%`;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${confirmees} parts confirmées et ${enAttente} en attente sur ${total}`}>
      <span className="h-full bg-ink" style={{ width: pc(confirmees) }} />
      <span className="h-full bg-wait-dot" style={{ width: pc(enAttente) }} />
    </div>
  );
}

function Chart({ d }: { d: TableauDeBord }) {
  const data = d.serie12Mois.map((p) => ({ mois: moisCourt(p.mois), long: moisLong(p.mois), ca: p.caCentimes / 100, charges: p.chargesCentimes / 100 }));
  return (
    <>
      <div className="h-[300px]" role="img" aria-label="Graphique du chiffre d’affaires et des charges sur 12 mois. Le tableau qui suit donne les valeurs.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="mois" tickLine={false} axisLine={false} tick={{ fontSize: 12.5, fill: '#5c5c5c', fontFamily: 'Inter' }} />
            <YAxis tickLine={false} axisLine={false} width={64} tick={{ fontSize: 12.5, fill: '#5c5c5c', fontFamily: 'Inter' }} tickFormatter={(v: number) => `${Math.round(v / 1000)} k€`} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 10px 30px -18px rgba(0,0,0,0.25)', fontFamily: 'Inter', fontSize: 13 }}
              labelFormatter={(_: unknown, p: readonly { payload?: { long?: string } }[]) => p?.[0]?.payload?.long ?? ''}
              formatter={(v, name) => [eurosArrondis(Number(v) * 100), name === 'ca' ? 'Chiffre d’affaires' : 'Charges']}
            />
            <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-[13px] text-muted">{v === 'ca' ? 'Chiffre d’affaires' : 'Charges'}</span>} />
            <Bar dataKey="ca" fill="#0a0a0a" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="charges" fill="#b8b8bc" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-[13.5px]">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-muted hover:text-ink [&::-webkit-details-marker]:hidden"><Icon name="chevronDown" className="h-4 w-4" />Voir les valeurs</summary>
        <table className="mt-3 w-full text-[13.5px]">
          <thead><tr className="border-b border-line text-left font-heading"><th className="py-1.5 font-semibold">Mois</th><th className="py-1.5 text-right font-semibold">CA</th><th className="py-1.5 text-right font-semibold">Charges</th></tr></thead>
          <tbody>
            {d.serie12Mois.map((p) => (
              <tr key={p.mois} className="border-b border-line last:border-0"><td className="py-1.5 capitalize">{moisLong(p.mois)}</td><td className="tnum py-1.5 text-right">{euros(p.caCentimes)}</td><td className="tnum py-1.5 text-right">{euros(p.chargesCentimes)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
