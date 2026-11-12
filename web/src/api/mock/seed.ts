import type { ContenuRapport } from '../types';
import type {
  AccesActifRow, CaisseRow, ConflitRow, Db, DemandeRow, DocumentRow, EcritureRow, JournalRow,
  OperationRow, RapportRow, SouscriptionRow, TransitionRow, VenteRow,
} from './model';

export const REFERENCE = '2026-11-12T09:00:00.000Z';
export const DEMO_PASSWORD = 'Demo2026!';
export const SEED_VERSION = 6;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hex(rand: () => number, n: number) {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(rand() * 16).toString(16);
  return s;
}

export function uuid(rand: () => number) {
  const h = hex(rand, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${'89ab'[Math.floor(rand() * 4)]}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const pad = (n: number, w = 4) => String(n).padStart(w, '0');
const iso = (y: number, m: number, d: number, h = 9, mi = 0) => new Date(Date.UTC(y, m - 1, d, h, mi)).toISOString();
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const euros = (e: number) => Math.round(e * 100);

// données de démo (date de référence : 12 nov. 2026), toujours identiques après un reset
export function buildSeed(): Db {
  const rand = mulberry32(20261112);
  const between = (a: number, b: number) => a + rand() * (b - a);

  const db: Db = {
    version: SEED_VERSION,
    comptes: [], acces: [], actifs: [], offres: [], enveloppes: [], souscriptions: [], operations: [], caisses: [],
    ventes: [], conflits: [], ecritures: [], documents: [], demandes: [], rapports: [], transitions: [], distributions: [], journal: [],
  };

  const compte = (id: string, email: string, nom: string, statut: 'ACTIF' | 'SUSPENDU' = 'ACTIF') =>
    db.comptes.push({ id, email, nom, motDePasse: DEMO_PASSWORD, statut, creeLe: iso(2025, 11, 3) });
  compte('cpt_proprio', 'proprietaire@fract.test', 'Karim El Amrani');
  compte('cpt_proprio_b', 'proprietaire.b@fract.test', 'Sofia Bennani');
  compte('cpt_auteur', 'auteur@fract.test', 'Yasmine Haddad');
  compte('cpt_verif', 'verificateur@fract.test', 'Omar Tazi');
  compte('cpt_pub', 'publication@fract.test', 'Leïla Mansouri');
  compte('cpt_caisse', 'caisse@fract.test', 'Poste Caisse comptoir');
  compte('cpt_suspendu', 'suspendu@fract.test', 'Compte suspendu', 'SUSPENDU');

  db.actifs.push(
    {
      id: 'act_atlas', proprietaireId: 'cpt_proprio', nom: 'Atlas Retail', type: 'COMMERCE', ville: 'Rabat',
      adresse: '24 avenue Mohammed V, Rabat', statut: 'FINANCE',
      description: 'Commerce de détail de produits du quotidien, 420 m² en centre-ville, ouvert 7 jours sur 7.',
    },
    {
      id: 'act_nova', proprietaireId: 'cpt_proprio', nom: 'Boutique Nova', type: 'COMMERCE', ville: 'Rabat',
      adresse: '8 rue Patrice Lumumba, Rabat', statut: 'PREPARATION',
      description: 'Boutique de prêt-à-porter en préparation de levée.',
    },
    {
      id: 'act_urban', proprietaireId: 'cpt_proprio_b', nom: 'Urban Market', type: 'COMMERCE', ville: 'Casablanca',
      adresse: '112 boulevard d’Anfa, Casablanca', statut: 'LEVEE_EN_COURS',
      description: 'Supérette de proximité.',
    },
  );

  const acces = (id: string, compteId: string, actifId: string, role: AccesActifRow['role'], depuis: string, caisseId: string | null = null) =>
    db.acces.push({ id, compteId, actifId, role, caisseId, depuis });
  acces('acc_1', 'cpt_proprio', 'act_atlas', 'PROPRIETAIRE', iso(2025, 11, 3));
  acces('acc_2', 'cpt_proprio', 'act_nova', 'PROPRIETAIRE', iso(2026, 9, 14));
  acces('acc_3', 'cpt_proprio_b', 'act_urban', 'PROPRIETAIRE', iso(2026, 6, 2));
  acces('acc_4', 'cpt_auteur', 'act_atlas', 'FINANCE_AUTEUR', iso(2026, 1, 5));
  acces('acc_5', 'cpt_verif', 'act_atlas', 'FINANCE_VERIFICATEUR', iso(2026, 1, 5));
  acces('acc_6', 'cpt_pub', 'act_atlas', 'FINANCE_PUBLICATION', iso(2026, 1, 5));
  acces('acc_7', 'cpt_caisse', 'act_atlas', 'OPERATEUR_CAISSE', iso(2025, 12, 1), 'cai_comptoir');
  acces('acc_8', 'cpt_suspendu', 'act_atlas', 'FINANCE_AUTEUR', iso(2026, 2, 1));

  db.offres.push({
    id: 'off_atlas', actifId: 'act_atlas', valeurReferenceCentimes: euros(1_000_000), dateValeur: iso(2026, 1, 15, 12),
    fractionPct: 20, prixPartCentimes: euros(100), nbParts: 2000, statut: 'CLOTUREE',
    droits: 'Chaque part donne droit à 1/2000 de 20 % des montants distribuables déclarés chaque trimestre. Les parts ne donnent ni droit de vote ni propriété du fonds de commerce.',
    conditionsDistribution: 'Distribution trimestrielle, décidée après publication du rapport du trimestre. Aucun montant n’est garanti.',
    conditionsTransfert: 'Transfert entre investisseurs inscrits uniquement, après un délai de 12 mois. Aucun marché secondaire n’est proposé.',
    ouverture: iso(2026, 2, 1, 8), cloture: iso(2026, 3, 31, 20),
  });
  db.enveloppes.push(
    { id: 'env_renov', offreId: 'off_atlas', libelle: 'Rénovation', montantPrevuCentimes: euros(90_000) },
    { id: 'env_stock', offreId: 'off_atlas', libelle: 'Stock', montantPrevuCentimes: euros(70_000) },
    { id: 'env_fdr', offreId: 'off_atlas', libelle: 'Fonds de roulement', montantPrevuCentimes: euros(40_000) },
  );

  const refs = Array.from({ length: 210 }, (_, i) => i + 1).sort(() => rand() - 0.5);
  const big = [96, 80, 64, 52, 45, 40, 36, 32, 30, 28, 25, 25, 22, 20, 20, 20];
  const qty: number[] = [];
  for (let i = 0; i < 208; i++) qty.push(i < big.length ? big[i] : 1 + Math.floor(rand() ** 2.2 * 14));
  let diff = 1985 - qty.reduce((a, b) => a + b, 0);
  for (let i = big.length; diff !== 0; i = i + 1 >= 208 ? big.length : i + 1) {
    if (diff > 0) { qty[i]++; diff--; } else if (qty[i] > 1) { qty[i]--; diff++; }
  }
  const opRand = mulberry32(42);
  let sIdx = 0;
  const souscrire = (ref: number, quantite: number, statut: SouscriptionRow['statut'], creeLe: string) => {
    sIdx++;
    const sid = `sou_${pad(sIdx)}`;
    db.souscriptions.push({ id: sid, offreId: 'off_atlas', investisseurRef: `#${pad(ref)}`, quantite, statut, creeLe });
    const envoyee = new Date(new Date(creeLe).getTime() + 4000).toISOString();
    const op: OperationRow = {
      id: `op_${pad(sIdx)}`, souscriptionId: sid, type: 'ATTRIBUTION', quantite, txHash: `0x${hex(opRand, 64)}`, statut,
      confirmations: statut === 'CONFIRMEE' ? 12 : 0, envoyeeLe: envoyee,
      confirmeeLe: statut === 'CONFIRMEE' ? new Date(new Date(envoyee).getTime() + 21000).toISOString() : null,
    };
    db.operations.push(op);
  };
  const start = Date.UTC(2026, 1, 1, 8);
  const span = Date.UTC(2026, 2, 29, 20) - start;
  const order = Array.from({ length: 208 }, (_, i) => i).sort(() => rand() - 0.5);
  const dated = order.map((i, k) => ({ i, t: start + Math.floor(((k + rand()) / 208) ** 1.4 * span) }));
  dated.sort((a, b) => a.t - b.t);
  for (const { i, t } of dated) {
    if (refs[i] === refs[5]) souscrire(refs[i], 5, 'ECHOUEE', new Date(t - 3600_000).toISOString());
    souscrire(refs[i], qty[i], 'CONFIRMEE', new Date(t).toISOString());
  }
  souscrire(refs[208], 10, 'EN_ATTENTE', iso(2026, 3, 31, 17, 42));
  souscrire(refs[209], 5, 'EN_ATTENTE', iso(2026, 3, 31, 19, 8));

  const syncNow = Math.max(Date.now(), Date.parse(REFERENCE) - 6 * 3600_000);
  const caisses: CaisseRow[] = [
    { id: 'cai_comptoir', actifId: 'act_atlas', nom: 'Caisse comptoir', appareil: 'Terminal Android SN-AT-0142', derniereSyncLe: new Date(syncNow - 12 * 60_000).toISOString() },
    { id: 'cai_entree', actifId: 'act_atlas', nom: 'Caisse entrée', appareil: 'Terminal Android SN-AT-0187', derniereSyncLe: new Date(syncNow - 30 * 3600_000).toISOString() },
  ];
  db.caisses.push(...caisses);
  const entreeCutoff = Date.parse(caisses[1].derniereSyncLe!);

  const months: { y: number; m: number; ca: number; ratio: number }[] = [];
  for (let k = 0; k < 12; k++) {
    const y = k === 0 ? 2025 : 2026;
    const m = k === 0 ? 12 : k;
    months.push({ y, m, ca: euros(Math.round(between(55_000, 75_000) / 10) * 10), ratio: between(0.85, 0.95) });
  }
  const t2 = { 4: euros(60_100), 5: euros(61_800), 6: euros(60_500) } as Record<number, number>;
  const t2Charges = { 4: euros(46_800), 5: euros(47_900), 6: euros(47_200) } as Record<number, number>;
  for (const mo of months) if (mo.y === 2026 && t2[mo.m]) mo.ca = t2[mo.m];

  const venteRand = mulberry32(7);
  let vIdx = 0;
  const refEnd = syncNow - 12 * 60_000;
  for (const mo of months) {
    const dim = daysIn(mo.y, mo.m);
    const lastDay = mo.y === 2026 && mo.m === 11 ? 11 : dim;
    const weights = Array.from({ length: dim }, (_, d) => {
      const wd = new Date(Date.UTC(mo.y, mo.m - 1, d + 1)).getUTCDay();
      return wd === 6 ? 1.35 : wd === 0 ? 0.7 : wd === 5 ? 1.15 : 1;
    });
    const sumW = weights.reduce((a, b) => a + b, 0);
    let monthTotal = mo.ca;
    if (lastDay < dim) monthTotal = Math.round((mo.ca * weights.slice(0, lastDay).reduce((a, b) => a + b, 0)) / sumW);
    const targets = weights.slice(0, lastDay).map((w) => Math.round((mo.ca * w) / sumW));
    const tSum = targets.reduce((a, b) => a + b, 0);
    targets[targets.length - 1] += monthTotal - tSum;
    mo.ca = monthTotal;
    targets.forEach((target, d) => {
      let left = target;
      while (left > 0) {
        let amount = Math.round((8 + -Math.log(1 - venteRand()) * 105) * 100);
        if (amount > left || left - amount < 500) amount = left;
        left -= amount;
        const t = Date.UTC(mo.y, mo.m - 1, d + 1, 9) + Math.floor(venteRand() * 11 * 3600_000);
        let caisseId = venteRand() < 0.64 ? 'cai_comptoir' : 'cai_entree';
        if (caisseId === 'cai_entree' && t > entreeCutoff) caisseId = 'cai_comptoir';
        if (t > refEnd) continue;
        vIdx++;
        const r = venteRand();
        db.ventes.push({
          id: `ven_${pad(vIdx, 6)}`, caisseId, venteUuid: uuid(venteRand), dateVente: new Date(t).toISOString(),
          recueLe: new Date(t + 2000 + Math.floor(venteRand() * 60_000)).toISOString(), montantCentimes: amount,
          moyenPaiement: r < 0.68 ? 'CARTE' : r < 0.96 ? 'ESPECES' : 'AUTRE',
        });
      }
    });
  }
  db.ventes.sort((a, b) => a.dateVente.localeCompare(b.dateVente));

  const recent = db.ventes.filter((v) => v.caisseId === 'cai_comptoir' && v.dateVente > iso(2026, 10, 20));
  const conflit = (id: string, v: VenteRow, delta: number, recu: string): ConflitRow => ({
    id, caisseId: v.caisseId, venteUuid: v.venteUuid, recuLe: recu,
    contenuRecu: { venteUuid: v.venteUuid, dateVente: v.dateVente, montantCentimes: v.montantCentimes + delta, moyenPaiement: v.moyenPaiement },
  });
  db.conflits.push(conflit('cfl_1', recent[40], 1000, iso(2026, 10, 28, 18, 4)), conflit('cfl_2', recent[220], -450, iso(2026, 11, 9, 19, 31)));

  let eIdx = 0;
  let dIdx = 0;
  const docRand = mulberry32(99);
  const addDoc = (actifId: string, nom: string, categorie: string, deposeLe: string, auteurId = 'cpt_proprio', extra: Partial<DocumentRow> = {}) => {
    dIdx++;
    const id = `doc_${pad(dIdx)}`;
    const mime = nom.endsWith('.png') ? 'image/png' : nom.endsWith('.jpg') ? 'image/jpeg' : 'application/pdf';
    db.documents.push({
      id, actifId, nom, categorie, mime, taille: Math.floor(60_000 + docRand() * 900_000), chemin: `storage/${actifId}/${id}`,
      auteurId, deposeLe, ecritureId: null, rapportId: null, ...extra,
    });
    return id;
  };
  const addEcriture = (e: Omit<EcritureRow, 'id' | 'actifId' | 'auteurId' | 'verrouillee' | 'corrigeId' | 'motifRejet' | 'documentId'> & Partial<EcritureRow>, withDoc = true) => {
    eIdx++;
    const id = `ecr_${pad(eIdx)}`;
    const row: EcritureRow = {
      actifId: 'act_atlas', auteurId: 'cpt_proprio', verrouillee: false, corrigeId: null, motifRejet: null, documentId: null, ...e, id,
    };
    if (withDoc) {
      const slug = row.fournisseur.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      row.documentId = addDoc('act_atlas', `facture-${slug}-${row.date.slice(0, 10)}.pdf`, 'Facture', new Date(Date.parse(row.date) + 86400_000).toISOString(), 'cpt_proprio', { ecritureId: id });
    }
    db.ecritures.push(row);
    return row;
  };

  const lockedUntil = iso(2026, 6, 30, 23, 59);
  const plan: [string, string, number, number][] = [
    ['Achats marchandises', 'Maghreb Distribution', 5, 0.24],
    ['Achats marchandises', 'Coopérative Al Baraka', 18, 0.19],
    ['Salaires', 'Paie du personnel', 28, 0.39],
    ['Énergie', 'Régie Énergie Rabat', 8, 0.055],
    ['Marketing', 'Agence Pixel Média', 10, 0.04],
    ['Maintenance', 'Clim Services', 14, 0.025],
    ['Honoraires', 'Cabinet Benali Expertise', 25, 0.035],
    ['Assurances', 'Atlas Assurances', 3, 0.015],
  ];
  const loyer = euros(9_500);
  let energieMai: EcritureRow | null = null;
  for (const mo of months) {
    const partial = mo.y === 2026 && mo.m === 11;
    const total = t2Charges[mo.m] && mo.y === 2026 ? t2Charges[mo.m] : Math.round(mo.ca * mo.ratio);
    const rest = total - loyer;
    const shares = plan.map((p) => p[3]);
    const sumS = shares.reduce((a, b) => a + b, 0);
    const amounts = shares.map((s) => Math.round((rest * s) / sumS));
    amounts[0] += rest - amounts.reduce((a, b) => a + b, 0);
    const lines: [string, string, number, number][] = [['Loyer', 'SCI Les Arcades', 1, loyer], ...plan.map((p, i) => [p[0], p[1], p[2], amounts[i]] as [string, string, number, number])];
    for (const [categorie, fournisseur, day, montant] of lines) {
      if (partial && day > 11) continue;
      const date = iso(mo.y, mo.m, day, 10);
      const inQ4 = date >= iso(2026, 10, 1, 0);
      const row = addEcriture({
        date, categorie, fournisseur, montantCentimes: montant, enveloppeId: null,
        statut: inQ4 && (mo.m === 11 || day >= 20) ? 'A_CONTROLER' : 'CONTROLEE',
        verrouillee: date <= lockedUntil && date >= iso(2026, 1, 1, 0),
        auteurId: 'cpt_proprio',
      });
      if (mo.y === 2026 && mo.m === 5 && categorie === 'Énergie') energieMai = row;
    }
  }
  if (energieMai) {
    const corrige = energieMai as EcritureRow;
    corrige.montantCentimes += euros(270);
    addEcriture({
      date: iso(2026, 5, 8, 10), categorie: 'Énergie', fournisseur: 'Régie Énergie Rabat', montantCentimes: corrige.montantCentimes - euros(270),
      enveloppeId: null, statut: 'CONTROLEE', corrigeId: corrige.id, verrouillee: true,
    });
  }
  addEcriture({ date: iso(2026, 10, 16, 10), categorie: 'Marketing', fournisseur: 'Imprimerie du Centre', montantCentimes: euros(1_380), enveloppeId: null, statut: 'REJETEE', motifRejet: 'Facture adressée à une autre société (Nova SARL). Merci de fournir une facture au nom d’Atlas Retail.' });
  const sansPiece = addEcriture({ date: iso(2026, 10, 22, 10), categorie: 'Maintenance', fournisseur: 'Froid Express', montantCentimes: euros(2_460), enveloppeId: null, statut: 'A_CONTROLER' }, false);

  const fonds: [string, string, string, number, number, number][] = [
    ['env_renov', 'Travaux', 'Bâti Rénov Maroc', 2026, 4, 28_400],
    ['env_renov', 'Travaux', 'Bâti Rénov Maroc', 2026, 5, 21_900],
    ['env_renov', 'Éclairage', 'Lumière & Co', 2026, 6, 9_800],
    ['env_renov', 'Signalétique', 'Enseignes Atlas', 2026, 7, 6_200],
    ['env_renov', 'Travaux', 'Bâti Rénov Maroc', 2026, 9, 6_000],
    ['env_stock', 'Stock', 'Maghreb Distribution', 2026, 4, 24_600],
    ['env_stock', 'Stock', 'Coopérative Al Baraka', 2026, 5, 18_300],
    ['env_stock', 'Stock', 'Maghreb Distribution', 2026, 8, 13_700],
    ['env_stock', 'Stock', 'Maghreb Distribution', 2026, 10, 8_200],
    ['env_fdr', 'Fonds de roulement', 'Atlas Retail (compte courant)', 2026, 4, 10_000],
    ['env_fdr', 'Fonds de roulement', 'Atlas Retail (compte courant)', 2026, 7, 8_500],
  ];
  for (const [enveloppeId, categorie, fournisseur, y, m, eur] of fonds) {
    const date = iso(y, m, 12, 10);
    addEcriture({ date, categorie, fournisseur, montantCentimes: euros(eur), enveloppeId, statut: m >= 10 ? 'A_CONTROLER' : 'CONTROLEE', verrouillee: date <= lockedUntil });
  }

  addDoc('act_atlas', 'bail-commercial-atlas-retail.pdf', 'Contrat', iso(2025, 11, 10));
  addDoc('act_atlas', 'registre-commerce-atlas-retail.pdf', 'Juridique', iso(2025, 11, 10));
  addDoc('act_atlas', 'attestation-assurance-2026.pdf', 'Assurance', iso(2026, 1, 8));
  addDoc('act_atlas', 'releve-bancaire-2026-09.pdf', 'Banque', iso(2026, 10, 6));
  addDoc('act_atlas', 'photo-facade-apres-travaux.jpg', 'Photo', iso(2026, 9, 20));
  addDoc('act_urban', 'bail-urban-market.pdf', 'Contrat', iso(2026, 6, 4), 'cpt_proprio_b');

  const demandes: DemandeRow[] = [
    { id: 'dem_1', actifId: 'act_atlas', demandeurId: 'cpt_verif', objet: 'Facture de la maintenance Froid Express du 22 oct. 2026 (2 460 €)', statut: 'OUVERTE', documentId: null, creeLe: iso(2026, 11, 3, 14), echeance: iso(2026, 11, 17, 18), ecritureId: sansPiece.id },
    { id: 'dem_2', actifId: 'act_atlas', demandeurId: 'cpt_auteur', objet: 'Relevé bancaire d’octobre 2026', statut: 'OUVERTE', documentId: null, creeLe: iso(2026, 11, 5, 10), echeance: iso(2026, 11, 20, 18), ecritureId: null },
    { id: 'dem_3', actifId: 'act_atlas', demandeurId: 'cpt_auteur', objet: 'Relevé bancaire de septembre 2026', statut: 'REPONDUE', documentId: db.documents.find((d) => d.nom === 'releve-bancaire-2026-09.pdf')!.id, creeLe: iso(2026, 10, 2, 10), echeance: iso(2026, 10, 16, 18), ecritureId: null },
  ];
  db.demandes.push(...demandes);

  const sumCa = (from: string, to: string) => db.ventes.filter((v) => v.dateVente >= from && v.dateVente <= to).reduce((a, v) => a + v.montantCentimes, 0);
  const sumCharges = (from: string, to: string) => {
    const replaced = new Set(db.ecritures.filter((e) => e.corrigeId && e.statut !== 'REJETEE').map((e) => e.corrigeId));
    return db.ecritures.filter((e) => !e.enveloppeId && e.statut !== 'REJETEE' && !replaced.has(e.id) && e.date >= from && e.date <= to).reduce((a, e) => a + e.montantCentimes, 0);
  };
  const contenu = (from: string, to: string, tresorerie: number, dettes: number, faits: string): ContenuRapport => {
    const ca = sumCa(from, to);
    const ch = sumCharges(from, to);
    return { caCentimes: ca, chargesCentimes: ch, resultatCentimes: ca - ch, tresorerieCentimes: euros(tresorerie), dettesCentimes: euros(dettes), faitsMarquants: faits };
  };
  let tIdx = 0;
  const trans = (rapportId: string, de: TransitionRow['de'], vers: TransitionRow['vers'], parId: string, le: string, motif: string | null = null) => {
    tIdx++;
    db.transitions.push({ id: `trn_${pad(tIdx)}`, rapportId, de, vers, parId, le, motif });
  };
  const base = { actifId: 'act_atlas', auteurId: 'cpt_auteur', motifCorrection: null, versionPrecedenteId: null };

  const t1: RapportRow = {
    ...base, id: 'rap_t1_v1', periode: 'T1 2026', version: 1, statut: 'PUBLIE', verificateurId: 'cpt_verif', publieParId: 'cpt_pub', publieLe: iso(2026, 5, 10, 11), majLe: iso(2026, 4, 27, 16),
    contenu: contenu(iso(2026, 1, 1, 0), iso(2026, 3, 31, 23, 59), 48_700, 225_000, 'Levée de 200 000 € ouverte le 1er février et close le 31 mars. Début du chantier de rénovation reporté à avril.'),
  };
  trans(t1.id, null, 'BROUILLON', 'cpt_auteur', iso(2026, 4, 20, 9));
  trans(t1.id, 'BROUILLON', 'SOUMIS', 'cpt_auteur', iso(2026, 4, 28, 10));
  trans(t1.id, 'SOUMIS', 'VALIDE', 'cpt_verif', iso(2026, 5, 5, 15));
  trans(t1.id, 'VALIDE', 'PUBLIE', 'cpt_pub', iso(2026, 5, 10, 11));

  const t2Faits = 'Rénovation de la surface de vente (phase 1) et réassort du stock financés par la levée. Fréquentation en hausse de 6 % sur mai.';
  const t2c = contenu(iso(2026, 4, 1, 0), iso(2026, 6, 30, 23, 59), 63_200, 210_000, t2Faits);
  const t2v1: RapportRow = {
    ...base, id: 'rap_t2_v1', periode: 'T2 2026', version: 1, statut: 'PUBLIE', verificateurId: 'cpt_verif', publieParId: 'cpt_pub', publieLe: iso(2026, 8, 8, 10), majLe: iso(2026, 7, 29, 17),
    contenu: { ...t2c, chargesCentimes: t2c.chargesCentimes + euros(270), resultatCentimes: t2c.resultatCentimes - euros(270), faitsMarquants: t2Faits },
  };
  const t2v2: RapportRow = {
    ...base, id: 'rap_t2_v2', periode: 'T2 2026', version: 2, statut: 'PUBLIE', verificateurId: 'cpt_verif', publieParId: 'cpt_pub', publieLe: iso(2026, 9, 12, 10), majLe: iso(2026, 9, 4, 12),
    contenu: t2c, versionPrecedenteId: t2v1.id,
    motifCorrection: 'Facture d’énergie de mai rectifiée par le fournisseur (-270 €) : charges et résultat du trimestre corrigés.',
  };
  trans(t2v1.id, null, 'BROUILLON', 'cpt_auteur', iso(2026, 7, 15, 9));
  trans(t2v1.id, 'BROUILLON', 'SOUMIS', 'cpt_auteur', iso(2026, 7, 29, 17));
  trans(t2v1.id, 'SOUMIS', 'VALIDE', 'cpt_verif', iso(2026, 8, 3, 11));
  trans(t2v1.id, 'VALIDE', 'PUBLIE', 'cpt_pub', iso(2026, 8, 8, 10));
  trans(t2v2.id, null, 'BROUILLON', 'cpt_auteur', iso(2026, 9, 2, 9), t2v2.motifCorrection);
  trans(t2v2.id, 'BROUILLON', 'SOUMIS', 'cpt_auteur', iso(2026, 9, 4, 12));
  trans(t2v2.id, 'SOUMIS', 'VALIDE', 'cpt_verif', iso(2026, 9, 9, 16));
  trans(t2v2.id, 'VALIDE', 'PUBLIE', 'cpt_pub', iso(2026, 9, 12, 10));

  const t3: RapportRow = {
    ...base, id: 'rap_t3_v1', periode: 'T3 2026', version: 1, statut: 'SOUMIS', verificateurId: null, publieParId: null, publieLe: null, majLe: iso(2026, 11, 4, 9),
    contenu: contenu(iso(2026, 7, 1, 0), iso(2026, 9, 30, 23, 59), 58_900, 196_000, 'Fin de la rénovation (signalétique en juillet). Saison estivale plus calme en août, reprise en septembre.'),
  };
  trans(t3.id, null, 'BROUILLON', 'cpt_auteur', iso(2026, 10, 15, 9));
  trans(t3.id, 'BROUILLON', 'SOUMIS', 'cpt_auteur', iso(2026, 10, 22, 14));
  trans(t3.id, 'SOUMIS', 'BROUILLON', 'cpt_verif', iso(2026, 10, 27, 10), 'Le solde de trésorerie ne correspond pas au relevé bancaire de septembre. Merci de joindre le relevé et d’ajuster le montant.');
  trans(t3.id, 'BROUILLON', 'SOUMIS', 'cpt_auteur', iso(2026, 11, 4, 9));
  db.rapports.push(t1, t2v1, t2v2, t3);
  addDoc('act_atlas', 'rapport-t1-2026-v1.pdf', 'Rapport', iso(2026, 5, 10, 11), 'cpt_pub', { rapportId: t1.id });
  addDoc('act_atlas', 'rapport-t2-2026-v2.pdf', 'Rapport', iso(2026, 9, 12, 10), 'cpt_pub', { rapportId: t2v2.id });

  db.distributions.push(
    { id: 'dis_t1', actifId: 'act_atlas', periode: 'T1 2026', montantDistribuableCentimes: euros(15_000), pctParts: 20, parPartCentimes: 150, declareeLe: iso(2026, 5, 20, 10) },
    { id: 'dis_t2', actifId: 'act_atlas', periode: 'T2 2026', montantDistribuableCentimes: euros(30_000), pctParts: 20, parPartCentimes: 300, declareeLe: iso(2026, 9, 22, 10) },
  );

  let jIdx = 0;
  const j = (auteurId: string, action: string, objet: string, le: string, actifId = 'act_atlas'): JournalRow => {
    jIdx++;
    return { id: `jrn_${pad(jIdx, 5)}`, actifId, auteurId, action, objet, le };
  };
  const journal: JournalRow[] = [
    j('cpt_proprio', 'ACTIF_CREE', 'Atlas Retail', iso(2025, 11, 3, 10)),
    j('cpt_proprio', 'OFFRE_MODIFIEE', 'Offre Atlas Retail (brouillon)', iso(2026, 1, 16, 15)),
    j('cpt_pub', 'OFFRE_OUVERTE', 'Offre Atlas Retail', iso(2026, 2, 1, 0)),
    j('cpt_pub', 'OFFRE_CLOTUREE', 'Offre Atlas Retail', iso(2026, 3, 31, 23, 59)),
    j('cpt_verif', 'ECRITURE_REJETEE', 'Marketing, Imprimerie du Centre', iso(2026, 10, 19, 11)),
    j('cpt_verif', 'DEMANDE_PIECE_CREEE', 'Facture de la maintenance Froid Express', iso(2026, 11, 3, 14)),
    j('cpt_auteur', 'DEMANDE_PIECE_CREEE', 'Relevé bancaire d’octobre 2026', iso(2026, 11, 5, 10)),
    j('cpt_proprio', 'DOCUMENT_DEPOSE', 'releve-bancaire-2026-09.pdf', iso(2026, 10, 6, 9)),
    j('cpt_proprio', 'DEMANDE_PIECE_REPONDUE', 'Relevé bancaire de septembre 2026', iso(2026, 10, 6, 9)),
    j('cpt_proprio', 'ECRITURE_CORRIGEE', 'Énergie mai 2026, Régie Énergie Rabat', iso(2026, 9, 1, 16)),
    j('cpt_caisse', 'VENTE_CONFLIT', `Caisse comptoir, vente ${db.conflits[0].venteUuid.slice(0, 8)}`, db.conflits[0].recuLe),
    j('cpt_caisse', 'VENTE_CONFLIT', `Caisse comptoir, vente ${db.conflits[1].venteUuid.slice(0, 8)}`, db.conflits[1].recuLe),
    j('cpt_pub', 'DISTRIBUTION_DECLAREE', 'T1 2026', iso(2026, 5, 20, 10)),
    j('cpt_pub', 'DISTRIBUTION_DECLAREE', 'T2 2026', iso(2026, 9, 22, 10)),
    j('cpt_proprio_b', 'ACTIF_CREE', 'Urban Market', iso(2026, 6, 2, 10), 'act_urban'),
    j('cpt_proprio', 'ACTIF_CREE', 'Boutique Nova', iso(2026, 9, 14, 10), 'act_nova'),
  ];
  const label: Record<string, string> = { BROUILLON: 'RAPPORT_CREE', SOUMIS: 'RAPPORT_SOUMIS', VALIDE: 'RAPPORT_VALIDE', PUBLIE: 'RAPPORT_PUBLIE' };
  for (const t of db.transitions) {
    const r = db.rapports.find((x) => x.id === t.rapportId)!;
    const action = t.de === 'SOUMIS' && t.vers === 'BROUILLON' ? 'RAPPORT_REFUSE' : t.de === null && r.version > 1 ? 'RAPPORT_CORRIGE' : label[t.vers];
    journal.push(j(t.parId, action, `${r.periode} v${r.version}`, t.le));
  }
  journal.sort((a, b) => a.le.localeCompare(b.le));
  db.journal.push(...journal);

  return db;
}
