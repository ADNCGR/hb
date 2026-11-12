import { CATEGORIES_DOCUMENT, CATEGORIES_ECRITURE, FORMATS_DOCUMENT, TAILLE_MAX_DOCUMENT } from '../constants';
import { ApiError } from '../errors';
import type * as T from '../types';
import type { CompteRow, Db, EcritureRow, RapportRow, VenteRow } from './model';
import { buildSeed, hex, uuid, SEED_VERSION } from './seed';
import { pdfPlaceholder, imagePlaceholder } from './files';

const STORAGE_KEY = 'fract.mock.db';
const TOKEN_TTL = 8 * 3600_000;
const AUTO_CONFIRM_MS = 20_000;
const RECONCILE_MS = 10 * 60_000;
const MAX_FILE = TAILLE_MAX_DOCUMENT;
const MIMES: readonly string[] = FORMATS_DOCUMENT;

let db: Db = load();
const files = new Map<string, Blob>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Db;
      if (parsed.version === SEED_VERSION) return parsed;
    }
  } catch {}
  return buildSeed();
}

function save() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch {}
  }, 150);
}

export function resetMockDb() {
  db = buildSeed();
  files.clear();
  save();
}

const now = () => new Date();
const nowIso = () => now().toISOString();
let seq = Date.now() % 100000;
const id = (prefix: string) => `${prefix}_${(++seq).toString(36)}${hex(Math.random, 4)}`;

const err = {
  unauth: () => new ApiError(401, 'NON_AUTHENTIFIE', 'Session absente ou expirée. Reconnectez-vous.'),
  suspendu: () => new ApiError(423, 'COMPTE_SUSPENDU', 'Ce compte est suspendu. Contactez l’équipe FRACT.'),
  interdit: (m = 'Vous n’avez pas accès à cette ressource.') => new ApiError(403, 'ACCES_REFUSE', m),
  introuvable: (m = 'Ressource introuvable.') => new ApiError(404, 'INTROUVABLE', m),
  conflit: (code: string, m: string) => new ApiError(409, code, m),
  invalide: (details: Record<string, string>) =>
    new ApiError(422, 'VALIDATION', Object.values(details)[0] ?? 'Données invalides.', details),
};

const READ_ROLES: T.Role[] = ['PROPRIETAIRE', 'FINANCE_AUTEUR', 'FINANCE_VERIFICATEUR', 'FINANCE_PUBLICATION', 'ADMIN'];
const FINANCE_ROLES: T.Role[] = ['FINANCE_AUTEUR', 'FINANCE_VERIFICATEUR', 'FINANCE_PUBLICATION', 'ADMIN'];

function nom(compteId: string | null) {
  if (!compteId) return null;
  if (compteId === 'systeme') return 'Registre (automatique)';
  return db.comptes.find((c) => c.id === compteId)?.nom ?? 'Compte supprimé';
}

function journal(actifId: string, auteurId: string, action: string, objet: string) {
  db.journal.push({ id: id('jrn'), actifId, auteurId, action, objet, le: nowIso() });
}

function compteDto(c: CompteRow): T.Compte {
  return { id: c.id, email: c.email, nom: c.nom, statut: c.statut, creeLe: c.creeLe };
}

function makeToken(compteId: string) {
  const payload = { sub: compteId, exp: Date.now() + TOKEN_TTL };
  return `mock.${btoa(JSON.stringify(payload))}.sig`;
}

function readToken(token: string | null): CompteRow {
  if (!token) throw err.unauth();
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { sub: string; exp: number };
    if (payload.exp < Date.now()) throw err.unauth();
    const c = db.comptes.find((x) => x.id === payload.sub);
    if (!c) throw err.unauth();
    if (c.statut === 'SUSPENDU') throw err.suspendu();
    return c;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw err.unauth();
  }
}

function rolesOn(compteId: string, actifId: string) {
  return db.acces.filter((a) => a.compteId === compteId && a.actifId === actifId);
}

// accès = rôle + actif (404 si l'actif n'existe pas, 403 sinon)
function guard(c: CompteRow, actifId: string, roles: T.Role[] = READ_ROLES) {
  const actif = db.actifs.find((a) => a.id === actifId);
  if (!actif) throw err.introuvable('Actif introuvable.');
  const mine = rolesOn(c.id, actifId);
  if (!mine.some((a) => roles.includes(a.role))) {
    throw err.interdit(mine.length ? 'Votre rôle ne permet pas cette action sur cet actif.' : 'Vous n’avez pas accès à cet actif.');
  }
  return { actif, roles: mine.map((a) => a.role) };
}

type Checks = Record<string, string>;
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isStr = (v: unknown, min = 1, max = 500): v is string => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
const isDate = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERIODE_RE = /^T[1-4] \d{4}$/;
const MOYENS: T.MoyenPaiement[] = ['CARTE', 'ESPECES', 'AUTRE'];
const CATEGORIES: readonly string[] = CATEGORIES_ECRITURE;

function fail(c: Checks) {
  if (Object.keys(c).length) throw err.invalide(c);
}

function body<B>(b: unknown): B {
  if (!b || typeof b !== 'object') throw err.invalide({ corps: 'Le corps de la requête est vide ou mal formé.' });
  return b as B;
}

function quarterOf(d: Date) {
  const q = Math.floor(d.getUTCMonth() / 3);
  const start = new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), q * 3 + 3, 1) - 1);
  return { label: `T${q + 1} ${d.getUTCFullYear()}`, start: start.toISOString(), end: end.toISOString() };
}

function periodRange(periode: string) {
  const [t, y] = periode.split(' ');
  const q = Number(t.slice(1)) - 1;
  const year = Number(y);
  return { start: new Date(Date.UTC(year, q * 3, 1)).toISOString(), end: new Date(Date.UTC(year, q * 3 + 3, 1) - 1).toISOString() };
}

// une écriture corrigée est remplacée par sa correction, une rejetée ne compte pas
function ecrituresActives(actifId: string) {
  const all = db.ecritures.filter((e) => e.actifId === actifId);
  const replaced = new Set(all.filter((e) => e.corrigeId && e.statut !== 'REJETEE').map((e) => e.corrigeId));
  return all.filter((e) => e.statut !== 'REJETEE' && !replaced.has(e.id));
}

function chargesBetween(actifId: string, from: string, to: string) {
  return ecrituresActives(actifId).filter((e) => !e.enveloppeId && e.date >= from && e.date <= to).reduce((a, e) => a + e.montantCentimes, 0);
}

function caBetween(actifId: string, from: string, to: string) {
  const caisses = new Set(db.caisses.filter((c) => c.actifId === actifId).map((c) => c.id));
  return db.ventes.filter((v) => caisses.has(v.caisseId) && v.dateVente >= from && v.dateVente <= to).reduce((a, v) => a + v.montantCentimes, 0);
}

// seules les opérations confirmées comptent dans le capital
function partsOf(offreId: string) {
  const sous = new Set(db.souscriptions.filter((s) => s.offreId === offreId).map((s) => s.id));
  const ops = db.operations.filter((o) => sous.has(o.souscriptionId) && o.type !== 'EMISSION');
  const sum = (st: T.StatutOperation) => ops.filter((o) => o.statut === st).reduce((a, o) => a + o.quantite, 0);
  return { confirmees: sum('CONFIRMEE'), enAttente: sum('EN_ATTENTE'), echouees: sum('ECHOUEE') };
}

function caisseEtat(c: (typeof db.caisses)[number]) {
  const h = c.derniereSyncLe ? (Date.now() - Date.parse(c.derniereSyncLe)) / 3600_000 : null;
  return { heuresDepuisSync: h === null ? null : Math.round(h * 10) / 10, enRetard: h === null || h > 24 };
}

function rapportDto(r: RapportRow): T.Rapport {
  return {
    ...r,
    auteurNom: nom(r.auteurId)!,
    verificateurNom: nom(r.verificateurId),
    publieParNom: nom(r.publieParId),
  };
}

function resumeRapport(r: RapportRow | undefined): T.RapportResume | null {
  return r ? { id: r.id, periode: r.periode, version: r.version, statut: r.statut, publieLe: r.publieLe } : null;
}

function offreDto(actifId: string): T.Offre | null {
  const o = db.offres.find((x) => x.actifId === actifId);
  if (!o) return null;
  const actif = db.actifs.find((a) => a.id === actifId)!;
  const p = partsOf(o.id);
  return {
    ...o,
    enveloppes: db.enveloppes.filter((e) => e.offreId === o.id).map(({ id: eid, libelle, montantPrevuCentimes }) => ({ id: eid, libelle, montantPrevuCentimes })),
    montantLeveCentimes: o.nbParts * o.prixPartCentimes,
    capitalConfirmeCentimes: p.confirmees * o.prixPartCentimes,
    partsConfirmees: p.confirmees,
    partsEnAttente: p.enAttente,
    partsEchouees: p.echouees,
    modifiable: actif.statut === 'PREPARATION' && o.statut === 'BROUILLON',
  };
}

function ecritureDto(e: EcritureRow): T.Ecriture {
  return {
    ...e,
    enveloppeLibelle: db.enveloppes.find((x) => x.id === e.enveloppeId)?.libelle ?? null,
    documentNom: db.documents.find((d) => d.id === e.documentId)?.nom ?? null,
    correctionIds: db.ecritures.filter((x) => x.corrigeId === e.id).map((x) => x.id),
    auteurNom: nom(e.auteurId)!,
  };
}

function venteContenu(v: VenteRow | T.VenteContenu): T.VenteContenu {
  return { venteUuid: v.venteUuid, dateVente: v.dateVente, montantCentimes: v.montantCentimes, moyenPaiement: v.moyenPaiement };
}

function sameVente(a: T.VenteContenu, b: T.VenteContenu) {
  return a.venteUuid === b.venteUuid && Date.parse(a.dateVente) === Date.parse(b.dateVente) && a.montantCentimes === b.montantCentimes && a.moyenPaiement === b.moyenPaiement;
}

function checkVente(v: Partial<T.VenteContenu>, prefix = ''): Checks {
  const c: Checks = {};
  if (!isStr(v.venteUuid) || !UUID_RE.test(v.venteUuid!)) c[`${prefix}venteUuid`] = 'L’identifiant de vente doit être un UUID.';
  if (!isDate(v.dateVente)) c[`${prefix}dateVente`] = 'La date de vente est invalide.';
  else if (Date.parse(v.dateVente!) > Date.now() + 5 * 60_000) c[`${prefix}dateVente`] = 'La date de vente ne peut pas être dans le futur.';
  if (!isInt(v.montantCentimes) || v.montantCentimes! <= 0) c[`${prefix}montantCentimes`] = 'Le montant doit être un entier positif (en centimes).';
  if (!MOYENS.includes(v.moyenPaiement as T.MoyenPaiement)) c[`${prefix}moyenPaiement`] = 'Le moyen de paiement doit être CARTE, ESPECES ou AUTRE.';
  return c;
}

// même UUID + même contenu => vente existante, contenu différent => 409 + conflit
function recevoirVente(caisseId: string, contenu: T.VenteContenu, auteurId: string): { status: 200 | 201; vente: VenteRow } {
  const existing = db.ventes.find((v) => v.caisseId === caisseId && v.venteUuid === contenu.venteUuid);
  const caisse = db.caisses.find((c) => c.id === caisseId)!;
  caisse.derniereSyncLe = nowIso();
  if (existing) {
    if (sameVente(venteContenu(existing), contenu)) return { status: 200, vente: existing };
    db.conflits.push({ id: id('cfl'), caisseId, venteUuid: contenu.venteUuid, contenuRecu: contenu, recuLe: nowIso() });
    journal(caisse.actifId, auteurId, 'VENTE_CONFLIT', `${caisse.nom}, vente ${contenu.venteUuid.slice(0, 8)}`);
    save();
    throw err.conflit('VENTE_CONFLIT', 'Une vente avec cet identifiant existe déjà avec un contenu différent. Rien n’a été modifié ; le conflit est enregistré.');
  }
  const vente: VenteRow = { id: id('ven'), caisseId, ...contenu, dateVente: new Date(contenu.dateVente).toISOString(), recueLe: nowIso() };
  db.ventes.push(vente);
  journal(caisse.actifId, auteurId, 'VENTE_RECUE', `${caisse.nom}, vente ${contenu.venteUuid.slice(0, 8)}`);
  save();
  return { status: 201, vente };
}

function venteDto(v: VenteRow): T.Vente {
  return { ...v, caisseNom: db.caisses.find((c) => c.id === v.caisseId)?.nom ?? '' };
}

function checkContenu(b: Partial<T.ContenuRapport>): Checks {
  const c: Checks = {};
  const pos = (k: keyof T.ContenuRapport, label: string) => {
    if (!isInt(b[k]) || (b[k] as number) < 0) c[k] = `${label} doit être un montant positif ou nul (en centimes).`;
  };
  pos('caCentimes', 'Le chiffre d’affaires');
  pos('chargesCentimes', 'Le total des charges');
  pos('tresorerieCentimes', 'La trésorerie');
  pos('dettesCentimes', 'Le montant des dettes');
  if (typeof b.faitsMarquants !== 'string' || b.faitsMarquants.length > 4000) c.faitsMarquants = 'Les faits marquants doivent faire au plus 4 000 caractères.';
  return c;
}

function normContenu(b: T.ContenuRapport): T.ContenuRapport {
  return { ...b, faitsMarquants: b.faitsMarquants.trim(), resultatCentimes: b.caCentimes - b.chargesCentimes };
}

function transition(r: RapportRow, vers: T.StatutRapport, parId: string, motif: string | null = null) {
  db.transitions.push({ id: id('trn'), rapportId: r.id, de: r.statut, vers, parId, le: nowIso(), motif });
  r.statut = vers;
  r.majLe = nowIso();
}

function actionsPermises(r: RapportRow, c: CompteRow): T.RapportDetail['actionsPermises'] {
  const roles = rolesOn(c.id, r.actifId).map((a) => a.role);
  const has = (role: T.Role) => roles.includes(role) || roles.includes('ADMIN');
  const latest = !db.rapports.some((x) => x.actifId === r.actifId && x.periode === r.periode && x.version > r.version);
  const out: T.RapportDetail['actionsPermises'] = [];
  if (r.statut === 'BROUILLON' && has('FINANCE_AUTEUR') && r.auteurId === c.id) out.push('MODIFIER', 'SOUMETTRE');
  if (r.statut === 'SOUMIS' && has('FINANCE_VERIFICATEUR') && r.auteurId !== c.id) out.push('VALIDER', 'REFUSER');
  if (r.statut === 'VALIDE' && has('FINANCE_PUBLICATION')) out.push('PUBLIER');
  if (r.statut === 'PUBLIE' && latest && has('FINANCE_AUTEUR')) out.push('CORRIGER');
  return out;
}

function rapportOr404(rid: string) {
  const r = db.rapports.find((x) => x.id === rid);
  if (!r) throw err.introuvable('Rapport introuvable.');
  return r;
}

// confirmation auto après 20 s (90 % de réussite), au-delà de 10 min : à rapprocher
function tickRegistre() {
  let changed = false;
  const t = Date.now();
  for (const op of db.operations) {
    if (op.statut !== 'EN_ATTENTE') continue;
    const age = t - Date.parse(op.envoyeeLe);
    if (age < AUTO_CONFIRM_MS || age > RECONCILE_MS) continue;
    settle(op.id, Math.random() < 0.9 ? 'CONFIRMEE' : 'ECHOUEE', null);
    changed = true;
  }
  if (changed) save();
}

function settle(opId: string, statut: 'CONFIRMEE' | 'ECHOUEE', auteurId: string | null) {
  const op = db.operations.find((o) => o.id === opId)!;
  op.statut = statut;
  op.confirmations = statut === 'CONFIRMEE' ? 12 : 0;
  op.confirmeeLe = statut === 'CONFIRMEE' ? nowIso() : null;
  const s = db.souscriptions.find((x) => x.id === op.souscriptionId);
  if (s) s.statut = statut;
  const offre = db.offres.find((o) => o.id === s?.offreId);
  if (offre) journal(offre.actifId, auteurId ?? 'systeme', statut === 'CONFIRMEE' ? 'OPERATION_CONFIRMEE' : 'OPERATION_ECHOUEE', `${op.txHash.slice(0, 10)}… (${op.quantite} parts)`);
}

if (typeof window !== 'undefined') setInterval(tickRegistre, 2000);

export interface MockRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
  token: string | null;
}

export interface MockResponse {
  status: number;
  body: unknown;
}

type Ctx = { params: Record<string, string>; query: Record<string, string>; body: unknown; token: string | null; me: () => CompteRow };
type Handler = (ctx: Ctx) => unknown | { __status: number; body: unknown };
const routes: { method: string; re: RegExp; keys: string[]; handler: Handler }[] = [];

function route(method: string, pattern: string, handler: Handler) {
  const keys: string[] = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  routes.push({ method, re, keys, handler });
}

const withStatus = (status: number, b: unknown) => ({ __status: status, body: b });

export function handle(req: MockRequest): MockResponse {
  const r = routes.find((x) => x.method === req.method && x.re.test(req.path));
  if (!r) return { status: 404, body: { code: 'INTROUVABLE', message: 'Route inconnue.' } };
  const m = req.path.match(r.re)!;
  const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
  try {
    let cached: CompteRow | null = null;
    const out = r.handler({ params, query: req.query, body: req.body, token: req.token, me: () => (cached ??= readToken(req.token)) });
    if (out && typeof out === 'object' && '__status' in out) {
      const o = out as { __status: number; body: unknown };
      return { status: o.__status, body: o.body };
    }
    return { status: req.method === 'POST' ? 201 : 200, body: out ?? null };
  } catch (e) {
    if (e instanceof ApiError) return { status: e.status, body: e.toBody() };
    return { status: 500, body: { code: 'ERREUR_INTERNE', message: 'Erreur interne du serveur.' } };
  }
}

export function handleFile(path: string, token: string | null): { status: number; blob?: Blob; nom?: string; body?: unknown } {
  const m = path.match(/^\/documents\/([^/]+)\/fichier$/);
  if (!m) return { status: 404, body: { code: 'INTROUVABLE', message: 'Route inconnue.' } };
  try {
    const c = readToken(token);
    const d = db.documents.find((x) => x.id === m[1]);
    if (!d) throw err.introuvable('Document introuvable.');
    guard(c, d.actifId);
    let blob = files.get(d.id);
    if (!blob) blob = d.mime === 'application/pdf' ? pdfPlaceholder(d.nom) : imagePlaceholder(d.nom, d.mime);
    return { status: 200, blob, nom: d.nom };
  } catch (e) {
    if (e instanceof ApiError) return { status: e.status, body: e.toBody() };
    throw e;
  }
}

route('POST', '/auth/login', ({ body: b }) => {
  const { email, motDePasse } = body<{ email?: string; motDePasse?: string }>(b);
  const c: Checks = {};
  if (!isStr(email) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email!)) c.email = 'Adresse e-mail invalide.';
  if (!isStr(motDePasse)) c.motDePasse = 'Le mot de passe est obligatoire.';
  fail(c);
  const compte = db.comptes.find((x) => x.email.toLowerCase() === email!.trim().toLowerCase());
  if (!compte || compte.motDePasse !== motDePasse) throw new ApiError(401, 'IDENTIFIANTS_INVALIDES', 'E-mail ou mot de passe incorrect.');
  if (compte.statut === 'SUSPENDU') throw err.suspendu();
  const res: T.LoginResponse = { token: makeToken(compte.id), expireLe: new Date(Date.now() + TOKEN_TTL).toISOString(), compte: compteDto(compte) };
  return withStatus(200, res);
});

route('GET', '/auth/me', ({ me }) => {
  const c = me();
  const res: T.Me = {
    compte: compteDto(c),
    acces: db.acces.filter((a) => a.compteId === c.id).map((a) => ({
      actifId: a.actifId, actifNom: db.actifs.find((x) => x.id === a.actifId)?.nom ?? '', role: a.role, caisseId: a.caisseId,
    })),
  };
  return res;
});

route('GET', '/actifs', ({ me }) => {
  const c = me();
  const mine = db.acces.filter((a) => a.compteId === c.id && READ_ROLES.includes(a.role));
  const ids = [...new Set(mine.map((a) => a.actifId))];
  return ids.map((aid): T.ActifListItem => ({ ...db.actifs.find((x) => x.id === aid)!, mesRoles: mine.filter((a) => a.actifId === aid).map((a) => a.role) }));
});

route('POST', '/actifs', ({ me, body: b }) => {
  const c = me();
  const v = body<Partial<T.ActifCreation>>(b);
  const k: Checks = {};
  if (!isStr(v.nom, 2, 80)) k.nom = 'Le nom doit faire entre 2 et 80 caractères.';
  if (!['COMMERCE', 'IMMOBILIER', 'ENTREPRISE'].includes(v.type as string)) k.type = 'Le type doit être COMMERCE, IMMOBILIER ou ENTREPRISE.';
  if (!isStr(v.ville, 2, 80)) k.ville = 'La ville est obligatoire.';
  if (!isStr(v.adresse, 4, 200)) k.adresse = 'L’adresse est obligatoire.';
  if (typeof v.description !== 'string' || v.description.length > 2000) k.description = 'La description doit faire au plus 2 000 caractères.';
  fail(k);
  const actif = { id: id('act'), proprietaireId: c.id, nom: v.nom!.trim(), type: v.type!, ville: v.ville!.trim(), adresse: v.adresse!.trim(), description: v.description!.trim(), statut: 'PREPARATION' as const };
  db.actifs.push(actif);
  db.acces.push({ id: id('acc'), compteId: c.id, actifId: actif.id, role: 'PROPRIETAIRE', caisseId: null, depuis: nowIso() });
  journal(actif.id, c.id, 'ACTIF_CREE', actif.nom);
  save();
  return { ...actif, mesRoles: ['PROPRIETAIRE'] } satisfies T.ActifListItem;
});

route('GET', '/actifs/:id', ({ me, params }) => {
  const { actif, roles } = guard(me(), params.id);
  return { ...actif, mesRoles: roles } satisfies T.ActifListItem;
});

route('GET', '/actifs/:id/tableau-de-bord', ({ me, params }) => {
  const { actif } = guard(me(), params.id);
  const t = now();
  const q = quarterOf(t);
  const ca = caBetween(actif.id, q.start, q.end);
  const ch = chargesBetween(actif.id, q.start, q.end);
  const serie: T.PointMensuel[] = [];
  for (let k = 11; k >= 0; k--) {
    const s = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - k, 1));
    const e = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 1) - 1);
    serie.push({ mois: s.toISOString().slice(0, 7), caCentimes: caBetween(actif.id, s.toISOString(), e.toISOString()), chargesCentimes: chargesBetween(actif.id, s.toISOString(), e.toISOString()) });
  }
  const rapports = db.rapports.filter((r) => r.actifId === actif.id);
  const publies = rapports.filter((r) => r.statut === 'PUBLIE').sort((a, b) => (b.publieLe ?? '').localeCompare(a.publieLe ?? ''));
  const enCours = rapports.filter((r) => r.statut !== 'PUBLIE').sort((a, b) => b.majLe.localeCompare(a.majLe))[0];
  const offre = offreDto(actif.id);
  const horizon = new Date(t.getTime() + 60 * 86400_000).toISOString();
  const echeances: T.Echeance[] = [];
  for (const d of db.demandes.filter((x) => x.actifId === actif.id && x.statut === 'OUVERTE')) {
    echeances.push({ date: d.echeance, libelle: `Pièce demandée : ${d.objet}`, type: 'PIECE', lien: 'documents' });
  }
  for (const r of rapports.filter((x) => x.statut !== 'PUBLIE')) {
    const end = new Date(periodRange(r.periode).end);
    echeances.push({ date: new Date(end.getTime() + 60 * 86400_000).toISOString(), libelle: `Publication du rapport ${r.periode} (délai de 60 jours)`, type: 'RAPPORT', lien: `rapports/${r.id}` });
  }
  echeances.push({ date: q.end, libelle: `Clôture du trimestre ${q.label}`, type: 'TRIMESTRE', lien: null });
  if (offre && offre.statut === 'OUVERTE') echeances.push({ date: offre.cloture, libelle: 'Clôture de l’offre', type: 'OFFRE', lien: 'levee' });
  const res: T.TableauDeBord = {
    donneesAu: nowIso(),
    trimestre: q.label,
    caTrimestreCentimes: ca,
    chargesTrimestreCentimes: ch,
    resultatProvisoireCentimes: ca - ch,
    resultatValide: false,
    tresorerieDeclareeCentimes: publies[0]?.contenu.tresorerieCentimes ?? null,
    tresorerieSource: publies[0] ? `Rapport ${publies[0].periode} v${publies[0].version} publié` : null,
    serie12Mois: serie,
    levee: offre ? {
      statutOffre: offre.statut, nbParts: offre.nbParts, prixPartCentimes: offre.prixPartCentimes, partsConfirmees: offre.partsConfirmees,
      partsEnAttente: offre.partsEnAttente, partsEchouees: offre.partsEchouees, capitalConfirmeCentimes: offre.capitalConfirmeCentimes, objectifCentimes: offre.montantLeveCentimes,
    } : null,
    dernierRapportPublie: resumeRapport(publies[0]),
    rapportEnCours: resumeRapport(enCours),
    caisses: db.caisses.filter((c) => c.actifId === actif.id).map((c) => ({ id: c.id, nom: c.nom, appareil: c.appareil, derniereSyncLe: c.derniereSyncLe, ...caisseEtat(c) })),
    echeances: echeances.filter((e) => e.date >= t.toISOString().slice(0, 10) && e.date <= horizon).sort((a, b) => a.date.localeCompare(b.date)),
  };
  return res;
});

route('GET', '/actifs/:id/offre', ({ me, params }) => {
  guard(me(), params.id);
  const o = offreDto(params.id);
  if (!o) throw err.introuvable('Aucune offre pour cet actif.');
  return o;
});

route('PUT', '/actifs/:id/offre', ({ me, params, body: b }) => {
  const c = me();
  const { actif } = guard(c, params.id, ['PROPRIETAIRE', 'ADMIN']);
  const existing = db.offres.find((o) => o.actifId === actif.id);
  if (actif.statut !== 'PREPARATION' || (existing && existing.statut !== 'BROUILLON')) {
    throw err.conflit('OFFRE_FIGEE', 'L’offre ne peut être modifiée que si l’actif est en préparation et l’offre en brouillon.');
  }
  const v = body<Partial<T.OffreBrouillon>>(b);
  const k: Checks = {};
  if (!isInt(v.valeurReferenceCentimes) || v.valeurReferenceCentimes! <= 0) k.valeurReferenceCentimes = 'La valeur de référence doit être un montant positif.';
  if (!isDate(v.dateValeur)) k.dateValeur = 'La date de la valeur est invalide.';
  if (typeof v.fractionPct !== 'number' || v.fractionPct <= 0 || v.fractionPct > 49) k.fractionPct = 'La fraction proposée doit être comprise entre 0 et 49 %.';
  if (!isInt(v.prixPartCentimes) || v.prixPartCentimes! <= 0) k.prixPartCentimes = 'Le prix d’une part doit être un montant positif.';
  if (!isInt(v.nbParts) || v.nbParts! <= 0) k.nbParts = 'Le nombre de parts doit être un entier positif.';
  if (!isStr(v.droits, 10, 2000)) k.droits = 'Décrivez les droits attachés aux parts (10 caractères au moins).';
  if (!isStr(v.conditionsDistribution, 10, 2000)) k.conditionsDistribution = 'Décrivez les conditions de distribution (10 caractères au moins).';
  if (!isStr(v.conditionsTransfert, 10, 2000)) k.conditionsTransfert = 'Décrivez les conditions de transfert (10 caractères au moins).';
  if (!isDate(v.ouverture)) k.ouverture = 'La date d’ouverture est invalide.';
  if (!isDate(v.cloture)) k.cloture = 'La date de clôture est invalide.';
  else if (isDate(v.ouverture) && Date.parse(v.cloture!) <= Date.parse(v.ouverture!)) k.cloture = 'La clôture doit suivre l’ouverture.';
  if (!Array.isArray(v.enveloppes) || v.enveloppes.some((e) => !isStr(e.libelle, 2, 80) || !isInt(e.montantPrevuCentimes) || e.montantPrevuCentimes <= 0)) {
    k.enveloppes = 'Chaque enveloppe doit avoir un libellé et un montant positif.';
  }
  fail(k);
  const montant = Math.round((v.valeurReferenceCentimes! * v.fractionPct!) / 100);
  const k2: Checks = {};
  if (v.nbParts! * v.prixPartCentimes! !== montant) k2.nbParts = 'Le nombre de parts multiplié par le prix d’une part doit être égal au montant proposé (valeur × fraction).';
  if (v.enveloppes!.length && v.enveloppes!.reduce((a, e) => a + e.montantPrevuCentimes, 0) !== montant) k2.enveloppes = 'La somme des enveloppes doit être égale au montant proposé.';
  fail(k2);
  const { enveloppes, ...fields } = v as T.OffreBrouillon;
  const offreId = existing?.id ?? id('off');
  const row = { id: offreId, actifId: actif.id, statut: 'BROUILLON' as const, ...fields, droits: fields.droits.trim(), conditionsDistribution: fields.conditionsDistribution.trim(), conditionsTransfert: fields.conditionsTransfert.trim() };
  if (existing) Object.assign(existing, row); else db.offres.push(row);
  db.enveloppes = db.enveloppes.filter((e) => e.offreId !== offreId).concat(enveloppes.map((e) => ({ id: id('env'), offreId, libelle: e.libelle.trim(), montantPrevuCentimes: e.montantPrevuCentimes })));
  journal(actif.id, c.id, 'OFFRE_MODIFIEE', `Offre ${actif.nom} (brouillon)`);
  save();
  return withStatus(200, offreDto(actif.id));
});

route('GET', '/actifs/:id/usage-fonds', ({ me, params }) => {
  guard(me(), params.id);
  const o = db.offres.find((x) => x.actifId === params.id);
  if (!o) throw err.introuvable('Aucune offre pour cet actif.');
  const actives = ecrituresActives(params.id);
  const envs = db.enveloppes.filter((e) => e.offreId === o.id).map((e) => {
    const deps = actives.filter((x) => x.enveloppeId === e.id).sort((a, b) => b.date.localeCompare(a.date));
    const depense = deps.reduce((a, x) => a + x.montantCentimes, 0);
    return {
      id: e.id, libelle: e.libelle, montantPrevuCentimes: e.montantPrevuCentimes, depenseCentimes: depense,
      resteCentimes: e.montantPrevuCentimes - depense, pctConsomme: Math.round((depense / e.montantPrevuCentimes) * 1000) / 10,
      depenses: deps.map((x) => ({ id: x.id, date: x.date, fournisseur: x.fournisseur, categorie: x.categorie, montantCentimes: x.montantCentimes, statut: x.statut })),
    };
  });
  const res: T.UsageFonds = {
    totalPrevuCentimes: envs.reduce((a, e) => a + e.montantPrevuCentimes, 0),
    totalDepenseCentimes: envs.reduce((a, e) => a + e.depenseCentimes, 0),
    totalResteCentimes: envs.reduce((a, e) => a + e.resteCentimes, 0),
    enveloppes: envs,
  };
  return res;
});

route('GET', '/actifs/:id/investisseurs', ({ me, params }) => {
  guard(me(), params.id);
  const o = db.offres.find((x) => x.actifId === params.id);
  if (!o) throw err.introuvable('Aucune offre pour cet actif.');
  const confirmed = new Set(db.operations.filter((op) => op.statut === 'CONFIRMEE').map((op) => op.souscriptionId));
  const per = new Map<string, number>();
  for (const s of db.souscriptions.filter((x) => x.offreId === o.id && confirmed.has(x.id))) per.set(s.investisseurRef, (per.get(s.investisseurRef) ?? 0) + s.quantite);
  const list = [...per.entries()].map(([ref, parts]) => ({ ref, parts })).sort((a, b) => b.parts - a.parts);
  const total = list.reduce((a, x) => a + x.parts, 0);
  const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  const bands: [string, number, number | null][] = [['1 à 5 parts', 1, 5], ['6 à 20 parts', 6, 20], ['21 à 50 parts', 21, 50], ['Plus de 50 parts', 51, null]];
  const top = (n: number) => list.slice(0, n).reduce((a, x) => a + x.parts, 0);
  const res: T.VueInvestisseurs = {
    nombre: list.length,
    partsConfirmees: total,
    tranches: bands.map(([libelle, min, max]) => {
      const inBand = list.filter((x) => x.parts >= min && (max === null || x.parts <= max));
      const parts = inBand.reduce((a, x) => a + x.parts, 0);
      return { libelle, min, max, investisseurs: inBand.length, parts, pctParts: pct(parts) };
    }),
    concentrations: [
      { libelle: 'Premier investisseur', pctParts: pct(top(1)) },
      { libelle: '5 premiers', pctParts: pct(top(5)) },
      { libelle: '10 premiers', pctParts: pct(top(10)) },
      { libelle: '20 premiers', pctParts: pct(top(20)) },
    ],
    principaux: list.slice(0, 10).map((x) => ({ ref: `Investisseur ${x.ref}`, parts: x.parts, pctParts: pct(x.parts) })),
    avertissement: 'Vue agrégée et pseudonymisée : aucun nom ni aucune adresse e-mail d’investisseur n’est communiqué au propriétaire.',
  };
  return res;
});

route('GET', '/actifs/:id/registre', ({ me, params }) => {
  guard(me(), params.id);
  const o = db.offres.find((x) => x.actifId === params.id);
  if (!o) throw err.introuvable('Aucune offre pour cet actif.');
  const sous = new Map(db.souscriptions.filter((s) => s.offreId === o.id).map((s) => [s.id, s]));
  const t = Date.now();
  const ops = db.operations.filter((op) => sous.has(op.souscriptionId)).map((op): T.OperationRegistre => ({
    ...op, investisseurRef: `Investisseur ${sous.get(op.souscriptionId)!.investisseurRef}`,
    aRapprocher: op.statut === 'EN_ATTENTE' && t - Date.parse(op.envoyeeLe) > RECONCILE_MS,
  })).sort((a, b) => b.envoyeeLe.localeCompare(a.envoyeeLe));
  const res: T.Registre = {
    resume: {
      confirmees: ops.filter((x) => x.statut === 'CONFIRMEE').length,
      enAttente: ops.filter((x) => x.statut === 'EN_ATTENTE').length,
      echouees: ops.filter((x) => x.statut === 'ECHOUEE').length,
      aRapprocher: ops.filter((x) => x.aRapprocher).length,
    },
    operations: ops,
  };
  return res;
});

route('GET', '/actifs/:id/caisses', ({ me, params }) => {
  guard(me(), params.id);
  const today = new Date().toISOString().slice(0, 10);
  return db.caisses.filter((c) => c.actifId === params.id).map((c): T.Caisse => ({
    ...c, ...caisseEtat(c), ventesAujourdhui: db.ventes.filter((v) => v.caisseId === c.id && v.dateVente.startsWith(today)).length,
  }));
});

route('GET', '/actifs/:id/ventes', ({ me, params, query }) => {
  guard(me(), params.id);
  const k: Checks = {};
  if (query.debut && !isDate(query.debut)) k.debut = 'La date de début est invalide.';
  if (query.fin && !isDate(query.fin)) k.fin = 'La date de fin est invalide.';
  const page = query.page ? Number(query.page) : 1;
  if (!Number.isInteger(page) || page < 1) k.page = 'Le numéro de page doit être un entier positif.';
  fail(k);
  const caisses = new Set(db.caisses.filter((c) => c.actifId === params.id).map((c) => c.id));
  if (query.caisseId && !caisses.has(query.caisseId)) throw err.introuvable('Caisse introuvable sur cet actif.');
  const from = query.debut ? new Date(query.debut).toISOString() : '';
  const to = query.fin ? new Date(Date.parse(query.fin) + 86400_000 - 1).toISOString() : '9999';
  const rows = db.ventes.filter((v) => caisses.has(v.caisseId) && (!query.caisseId || v.caisseId === query.caisseId) && v.dateVente >= from && v.dateVente <= to);
  rows.sort((a, b) => b.dateVente.localeCompare(a.dateVente));
  const parPage = 25;
  const res: T.VentesPage = {
    items: rows.slice((page - 1) * parPage, page * parPage).map(venteDto),
    page, parPage, total: rows.length, pages: Math.max(1, Math.ceil(rows.length / parPage)),
    totalMontantCentimes: rows.reduce((a, v) => a + v.montantCentimes, 0),
  };
  return res;
});

route('GET', '/actifs/:id/ventes/conflits', ({ me, params }) => {
  guard(me(), params.id);
  const caisses = new Map(db.caisses.filter((c) => c.actifId === params.id).map((c) => [c.id, c]));
  return db.conflits.filter((c) => caisses.has(c.caisseId)).sort((a, b) => b.recuLe.localeCompare(a.recuLe)).map((c): T.ConflitVente => {
    const v = db.ventes.find((x) => x.caisseId === c.caisseId && x.venteUuid === c.venteUuid);
    const ex = v ? venteContenu(v) : null;
    const differences = ex ? (['dateVente', 'montantCentimes', 'moyenPaiement'] as const).filter((key) => (key === 'dateVente' ? Date.parse(ex[key]) !== Date.parse(c.contenuRecu[key]) : ex[key] !== c.contenuRecu[key])) : [];
    return { id: c.id, caisseId: c.caisseId, caisseNom: caisses.get(c.caisseId)!.nom, venteUuid: c.venteUuid, recuLe: c.recuLe, contenuRecu: c.contenuRecu, venteExistante: ex, differences: [...differences] };
  });
});

route('POST', '/caisses/:caisseId/ventes', ({ me, params, body: b }) => {
  const c = me();
  const caisse = db.caisses.find((x) => x.id === params.caisseId);
  if (!caisse) throw err.introuvable('Caisse introuvable.');
  const ok = db.acces.some((a) => a.compteId === c.id && a.actifId === caisse.actifId && a.role === 'OPERATEUR_CAISSE' && a.caisseId === caisse.id);
  if (!ok) throw err.interdit('Seul l’opérateur de cette caisse peut y envoyer des ventes.');
  const v = body<Partial<T.VenteContenu>>(b);
  fail(checkVente(v));
  const out = recevoirVente(caisse.id, venteContenu(v as T.VenteContenu), c.id);
  return withStatus(out.status, venteDto(out.vente));
});

route('POST', '/actifs/:id/ventes/import', ({ me, params, body: b }) => {
  const c = me();
  guard(c, params.id, ['PROPRIETAIRE', 'ADMIN']);
  const { contenu } = body<{ contenu?: string }>(b);
  if (typeof contenu !== 'string' || !contenu.trim()) throw err.invalide({ fichier: 'Le fichier CSV est vide.' });
  const lines = contenu.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift()!.split(',').map((h) => h.trim().toLowerCase());
  const expected = ['caisse_id', 'vente_uuid', 'date', 'montant', 'moyen_paiement'];
  if (expected.some((h, i) => head[i] !== h)) throw err.invalide({ fichier: `En-tête attendu : ${expected.join(',')}` });
  const caisses = new Set(db.caisses.filter((x) => x.actifId === params.id).map((x) => x.id));
  const bilan: T.BilanImport = { lignes: lines.length, creees: 0, dejaPresentes: 0, conflits: 0, invalides: [] };
  lines.forEach((line, i) => {
    const n = i + 2;
    const [caisseId, venteUuid, date, montant, moyen] = line.split(',').map((x) => x.trim());
    if (!caisses.has(caisseId)) { bilan.invalides.push({ ligne: n, erreur: `Caisse « ${caisseId ?? ''} » inconnue sur cet actif.` }); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(montant ?? '')) { bilan.invalides.push({ ligne: n, erreur: 'Montant invalide (exemple : 45.90).' }); return; }
    const v: T.VenteContenu = { venteUuid, dateVente: date && isDate(date) ? new Date(date).toISOString() : date, montantCentimes: Math.round(Number(montant) * 100), moyenPaiement: (moyen ?? '').toUpperCase() as T.MoyenPaiement };
    const k = checkVente(v);
    if (Object.keys(k).length) { bilan.invalides.push({ ligne: n, erreur: Object.values(k)[0] }); return; }
    try {
      const out = recevoirVente(caisseId, v, c.id);
      if (out.status === 201) bilan.creees++; else bilan.dejaPresentes++;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) bilan.conflits++; else throw e;
    }
  });
  journal(params.id, c.id, 'VENTES_IMPORTEES', `${bilan.creees} créées, ${bilan.dejaPresentes} déjà présentes, ${bilan.conflits} conflits, ${bilan.invalides.length} invalides`);
  save();
  return withStatus(200, bilan);
});

route('GET', '/actifs/:id/ecritures', ({ me, params, query }) => {
  guard(me(), params.id);
  return db.ecritures.filter((e) => e.actifId === params.id && (!query.statut || e.statut === query.statut))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).map(ecritureDto);
});

function checkEcriture(actifId: string, v: Partial<T.EcritureCreation>): Checks {
  const k: Checks = {};
  if (!isDate(v.date)) k.date = 'La date est invalide.';
  else if (Date.parse(v.date!) > Date.now()) k.date = 'La date ne peut pas être dans le futur.';
  if (!CATEGORIES.includes(v.categorie as string)) k.categorie = 'Choisissez une catégorie de la liste.';
  if (!isInt(v.montantCentimes) || v.montantCentimes! <= 0) k.montantCentimes = 'Le montant doit être positif.';
  if (!isStr(v.fournisseur, 2, 120)) k.fournisseur = 'Le fournisseur est obligatoire.';
  if (v.enveloppeId) {
    const o = db.offres.find((x) => x.actifId === actifId);
    if (!o || !db.enveloppes.some((e) => e.id === v.enveloppeId && e.offreId === o.id)) k.enveloppeId = 'Enveloppe inconnue sur cet actif.';
  }
  if (v.documentId && !db.documents.some((d) => d.id === v.documentId && d.actifId === actifId)) k.documentId = 'Justificatif inconnu sur cet actif.';
  return k;
}

route('POST', '/actifs/:id/ecritures', ({ me, params, body: b }) => {
  const c = me();
  guard(c, params.id, ['PROPRIETAIRE', 'ADMIN']);
  const v = body<Partial<T.EcritureCreation>>(b);
  fail(checkEcriture(params.id, v));
  const row: EcritureRow = {
    id: id('ecr'), actifId: params.id, date: new Date(v.date!).toISOString(), categorie: v.categorie!, montantCentimes: v.montantCentimes!,
    fournisseur: v.fournisseur!.trim(), enveloppeId: v.enveloppeId ?? null, documentId: v.documentId ?? null, statut: 'A_CONTROLER',
    motifRejet: null, verrouillee: false, corrigeId: null, auteurId: c.id,
  };
  db.ecritures.push(row);
  if (row.documentId) db.documents.find((d) => d.id === row.documentId)!.ecritureId = row.id;
  journal(params.id, c.id, 'ECRITURE_CREEE', `${row.categorie}, ${row.fournisseur}`);
  save();
  return ecritureDto(row);
});

route('POST', '/ecritures/:id/controle', ({ me, params, body: b }) => {
  const c = me();
  const e = db.ecritures.find((x) => x.id === params.id);
  if (!e) throw err.introuvable('Écriture introuvable.');
  guard(c, e.actifId, FINANCE_ROLES);
  const v = body<Partial<T.EcritureControle>>(b);
  const k: Checks = {};
  if (v.decision !== 'CONTROLEE' && v.decision !== 'REJETEE') k.decision = 'La décision doit être CONTROLEE ou REJETEE.';
  if (v.decision === 'REJETEE' && !isStr(v.motif, 5, 500)) k.motif = 'Un motif de rejet est obligatoire (5 caractères au moins).';
  fail(k);
  if (e.verrouillee) throw err.conflit('ECRITURE_VERROUILLEE', 'Cette écriture est incluse dans un rapport validé : elle est verrouillée.');
  if (e.statut !== 'A_CONTROLER') throw err.conflit('DEJA_CONTROLEE', 'Cette écriture a déjà été contrôlée.');
  e.statut = v.decision!;
  e.motifRejet = v.decision === 'REJETEE' ? v.motif!.trim() : null;
  journal(e.actifId, c.id, v.decision === 'REJETEE' ? 'ECRITURE_REJETEE' : 'ECRITURE_CONTROLEE', `${e.categorie}, ${e.fournisseur}`);
  save();
  return withStatus(200, ecritureDto(e));
});

route('POST', '/ecritures/:id/correction', ({ me, params, body: b }) => {
  const c = me();
  const e = db.ecritures.find((x) => x.id === params.id);
  if (!e) throw err.introuvable('Écriture introuvable.');
  guard(c, e.actifId, ['PROPRIETAIRE', 'ADMIN']);
  if (!e.verrouillee && e.statut !== 'REJETEE') throw err.conflit('CORRECTION_INUTILE', 'Seule une écriture verrouillée ou rejetée se corrige par une écriture de correction.');
  if (db.ecritures.some((x) => x.corrigeId === e.id && x.statut !== 'REJETEE')) throw err.conflit('DEJA_CORRIGEE', 'Cette écriture a déjà une correction en cours ou contrôlée.');
  const v = body<Partial<T.EcritureCreation>>(b);
  fail(checkEcriture(e.actifId, v));
  const row: EcritureRow = {
    id: id('ecr'), actifId: e.actifId, date: new Date(v.date!).toISOString(), categorie: v.categorie!, montantCentimes: v.montantCentimes!,
    fournisseur: v.fournisseur!.trim(), enveloppeId: v.enveloppeId ?? null, documentId: v.documentId ?? null, statut: 'A_CONTROLER',
    motifRejet: null, verrouillee: false, corrigeId: e.id, auteurId: c.id,
  };
  db.ecritures.push(row);
  journal(e.actifId, c.id, 'ECRITURE_CORRIGEE', `${e.categorie}, ${e.fournisseur}`);
  save();
  return ecritureDto(row);
});

const docDto = (d: (typeof db.documents)[number]): T.DocumentFichier => ({
  id: d.id, actifId: d.actifId, nom: d.nom, categorie: d.categorie, mime: d.mime, taille: d.taille, auteurNom: nom(d.auteurId)!, deposeLe: d.deposeLe, ecritureId: d.ecritureId, rapportId: d.rapportId,
});

route('GET', '/actifs/:id/documents', ({ me, params }) => {
  guard(me(), params.id);
  return db.documents.filter((d) => d.actifId === params.id).sort((a, b) => b.deposeLe.localeCompare(a.deposeLe)).map(docDto);
});

route('POST', '/actifs/:id/documents', ({ me, params, body: b }) => {
  const c = me();
  guard(c, params.id, ['PROPRIETAIRE', ...FINANCE_ROLES]);
  if (!(b instanceof FormData)) throw err.invalide({ fichier: 'Envoyez le fichier en multipart/form-data.' });
  const file = b.get('fichier');
  const categorie = String(b.get('categorie') ?? '');
  const ecritureId = String(b.get('ecritureId') ?? '') || null;
  const k: Checks = {};
  if (!(file instanceof File)) k.fichier = 'Aucun fichier reçu.';
  else if (!MIMES.includes(file.type)) k.fichier = 'Format refusé : seuls les PDF, JPG et PNG sont acceptés.';
  else if (file.size > MAX_FILE) k.fichier = 'Le fichier dépasse la taille maximale de 10 Mo.';
  else if (file.size === 0) k.fichier = 'Le fichier est vide.';
  if (!(CATEGORIES_DOCUMENT as readonly string[]).includes(categorie)) k.categorie = 'Choisissez une catégorie de la liste.';
  const ecr = ecritureId ? db.ecritures.find((e) => e.id === ecritureId && e.actifId === params.id) : null;
  if (ecritureId && !ecr) k.ecritureId = 'Écriture inconnue sur cet actif.';
  fail(k);
  const f = file as File;
  const docId = id('doc');
  const row = { id: docId, actifId: params.id, nom: f.name, categorie, mime: f.type, taille: f.size, chemin: `storage/${params.id}/${docId}`, auteurId: c.id, deposeLe: nowIso(), ecritureId: ecr?.id ?? null, rapportId: null };
  db.documents.push(row);
  files.set(docId, f);
  if (ecr && !ecr.documentId) ecr.documentId = docId;
  journal(params.id, c.id, 'DOCUMENT_DEPOSE', f.name);
  save();
  return docDto(row);
});

route('GET', '/actifs/:id/demandes-pieces', ({ me, params }) => {
  guard(me(), params.id);
  return db.demandes.filter((d) => d.actifId === params.id).sort((a, b) => (a.statut === b.statut ? b.creeLe.localeCompare(a.creeLe) : a.statut === 'OUVERTE' ? -1 : 1)).map((d): T.DemandePiece => ({
    id: d.id, actifId: d.actifId, demandeurNom: nom(d.demandeurId)!, objet: d.objet, statut: d.statut, documentId: d.documentId,
    documentNom: db.documents.find((x) => x.id === d.documentId)?.nom ?? null, creeLe: d.creeLe, echeance: d.echeance, ecritureId: d.ecritureId,
  }));
});

route('POST', '/demandes-pieces/:id/reponse', ({ me, params, body: b }) => {
  const c = me();
  const d = db.demandes.find((x) => x.id === params.id);
  if (!d) throw err.introuvable('Demande introuvable.');
  guard(c, d.actifId, ['PROPRIETAIRE', 'ADMIN']);
  if (d.statut !== 'OUVERTE') throw err.conflit('DEJA_REPONDUE', 'Cette demande a déjà reçu une réponse.');
  const { documentId } = body<{ documentId?: string }>(b);
  const doc = db.documents.find((x) => x.id === documentId && x.actifId === d.actifId);
  if (!doc) throw err.invalide({ documentId: 'Choisissez un document de cet actif.' });
  d.statut = 'REPONDUE';
  d.documentId = doc.id;
  if (d.ecritureId) {
    const e = db.ecritures.find((x) => x.id === d.ecritureId);
    if (e && !e.documentId) { e.documentId = doc.id; doc.ecritureId = e.id; }
  }
  journal(d.actifId, c.id, 'DEMANDE_PIECE_REPONDUE', d.objet);
  save();
  return withStatus(200, { ok: true });
});

route('GET', '/actifs/:id/rapports', ({ me, params }) => {
  guard(me(), params.id);
  return db.rapports.filter((r) => r.actifId === params.id).sort((a, b) => b.periode.slice(3).localeCompare(a.periode.slice(3)) || b.periode.localeCompare(a.periode) || b.version - a.version).map(rapportDto);
});

route('GET', '/actifs/:id/rapports/pre-remplissage', ({ me, params, query }) => {
  guard(me(), params.id, FINANCE_ROLES);
  if (!PERIODE_RE.test(query.periode ?? '')) throw err.invalide({ periode: 'La période doit être de la forme « T3 2026 ».' });
  const { start, end } = periodRange(query.periode);
  const ca = caBetween(params.id, start, end);
  const ch = chargesBetween(params.id, start, end);
  return { caCentimes: ca, chargesCentimes: ch, resultatCentimes: ca - ch } satisfies Partial<T.ContenuRapport>;
});

route('GET', '/rapports/:id', ({ me, params }) => {
  const c = me();
  const r = rapportOr404(params.id);
  guard(c, r.actifId);
  const versions = db.rapports.filter((x) => x.actifId === r.actifId && x.periode === r.periode).sort((a, b) => a.version - b.version);
  const ids = new Set(versions.map((x) => x.id));
  const res: T.RapportDetail = {
    ...rapportDto(r),
    versions: versions.map(rapportDto),
    transitions: db.transitions.filter((t) => ids.has(t.rapportId)).sort((a, b) => a.le.localeCompare(b.le)).map((t) => ({
      id: t.id, rapportId: t.rapportId, version: versions.find((v) => v.id === t.rapportId)!.version, de: t.de, vers: t.vers, parNom: nom(t.parId)!, le: t.le, motif: t.motif,
    })),
    actionsPermises: actionsPermises(r, c),
  };
  return res;
});

route('POST', '/actifs/:id/rapports', ({ me, params, body: b }) => {
  const c = me();
  guard(c, params.id, ['FINANCE_AUTEUR', 'ADMIN']);
  const v = body<Partial<T.RapportCreation>>(b);
  const k: Checks = {};
  if (!PERIODE_RE.test(v.periode ?? '')) k.periode = 'La période doit être de la forme « T3 2026 ».';
  Object.assign(k, checkContenu(v.contenu ?? {}));
  fail(k);
  if (db.rapports.some((r) => r.actifId === params.id && r.periode === v.periode)) throw err.conflit('RAPPORT_EXISTANT', `Un rapport existe déjà pour ${v.periode}. Pour le modifier après publication, créez une correction.`);
  const r: RapportRow = {
    id: id('rap'), actifId: params.id, periode: v.periode!, version: 1, statut: 'BROUILLON', auteurId: c.id, verificateurId: null, publieParId: null, publieLe: null,
    contenu: normContenu(v.contenu as T.ContenuRapport), motifCorrection: null, versionPrecedenteId: null, majLe: nowIso(),
  };
  db.rapports.push(r);
  db.transitions.push({ id: id('trn'), rapportId: r.id, de: null, vers: 'BROUILLON', parId: c.id, le: nowIso(), motif: null });
  journal(params.id, c.id, 'RAPPORT_CREE', `${r.periode} v1`);
  save();
  return rapportDto(r);
});

route('PATCH', '/rapports/:id', ({ me, params, body: b }) => {
  const c = me();
  const r = rapportOr404(params.id);
  guard(c, r.actifId, ['FINANCE_AUTEUR', 'ADMIN']);
  if (r.auteurId !== c.id) throw err.interdit('Seul l’auteur du rapport peut le modifier.');
  if (r.statut !== 'BROUILLON') throw err.conflit('RAPPORT_NON_MODIFIABLE', 'Seul un rapport en brouillon peut être modifié.');
  const v = body<Partial<T.ContenuRapport>>(b);
  fail(checkContenu(v));
  r.contenu = normContenu(v as T.ContenuRapport);
  r.majLe = nowIso();
  journal(r.actifId, c.id, 'RAPPORT_MODIFIE', `${r.periode} v${r.version}`);
  save();
  return withStatus(200, rapportDto(r));
});

const badState = (r: RapportRow, attendu: string) => err.conflit('TRANSITION_INVALIDE', `Le rapport est à l’état ${r.statut} : cette action demande l’état ${attendu}.`);

route('POST', '/rapports/:id/soumettre', ({ me, params }) => {
  const c = me();
  const r = rapportOr404(params.id);
  guard(c, r.actifId, ['FINANCE_AUTEUR', 'ADMIN']);
  if (r.auteurId !== c.id) throw err.interdit('Seul l’auteur du rapport peut le soumettre.');
  if (r.statut !== 'BROUILLON') throw badState(r, 'BROUILLON');
  transition(r, 'SOUMIS', c.id);
  journal(r.actifId, c.id, 'RAPPORT_SOUMIS', `${r.periode} v${r.version}`);
  save();
  return withStatus(200, rapportDto(r));
});

route('POST', '/rapports/:id/valider', ({ me, params }) => {
  const c = me();
  const r = rapportOr404(params.id);
  guard(c, r.actifId, ['FINANCE_VERIFICATEUR', 'ADMIN']);
  if (r.auteurId === c.id) throw err.interdit('Le vérificateur doit être différent de l’auteur du rapport.');
  if (r.statut !== 'SOUMIS') throw badState(r, 'SOUMIS');
  transition(r, 'VALIDE', c.id);
  r.verificateurId = c.id;
  const { start, end } = periodRange(r.periode);
  for (const e of db.ecritures) if (e.actifId === r.actifId && e.date >= start && e.date <= end && e.statut === 'CONTROLEE') e.verrouillee = true;
  journal(r.actifId, c.id, 'RAPPORT_VALIDE', `${r.periode} v${r.version}`);
  save();
  return withStatus(200, rapportDto(r));
});

route('POST', '/rapports/:id/refuser', ({ me, params, body: b }) => {
  const c = me();
  const r = rapportOr404(params.id);
  guard(c, r.actifId, ['FINANCE_VERIFICATEUR', 'ADMIN']);
  if (r.auteurId === c.id) throw err.interdit('Le vérificateur doit être différent de l’auteur du rapport.');
  const { motif } = body<{ motif?: string }>(b ?? {});
  if (!isStr(motif, 5, 1000)) throw err.invalide({ motif: 'Un motif de refus est obligatoire (5 caractères au moins).' });
  if (r.statut !== 'SOUMIS') throw badState(r, 'SOUMIS');
  transition(r, 'BROUILLON', c.id, motif!.trim());
  journal(r.actifId, c.id, 'RAPPORT_REFUSE', `${r.periode} v${r.version}`);
  save();
  return withStatus(200, rapportDto(r));
});

route('POST', '/rapports/:id/publier', ({ me, params }) => {
  const c = me();
  const r = rapportOr404(params.id);
  guard(c, r.actifId, ['FINANCE_PUBLICATION', 'ADMIN']);
  if (r.statut !== 'VALIDE') throw badState(r, 'VALIDE');
  transition(r, 'PUBLIE', c.id);
  r.publieParId = c.id;
  r.publieLe = nowIso();
  journal(r.actifId, c.id, 'RAPPORT_PUBLIE', `${r.periode} v${r.version}`);
  save();
  return withStatus(200, rapportDto(r));
});

route('POST', '/rapports/:id/corriger', ({ me, params, body: b }) => {
  const c = me();
  const r = rapportOr404(params.id);
  guard(c, r.actifId, ['FINANCE_AUTEUR', 'ADMIN']);
  const { motif } = body<{ motif?: string }>(b ?? {});
  if (!isStr(motif, 5, 1000)) throw err.invalide({ motif: 'Un motif de correction est obligatoire (5 caractères au moins).' });
  if (r.statut !== 'PUBLIE') throw badState(r, 'PUBLIE');
  if (db.rapports.some((x) => x.actifId === r.actifId && x.periode === r.periode && x.version > r.version)) {
    throw err.conflit('VERSION_EXISTANTE', 'Une version plus récente existe déjà pour cette période.');
  }
  const next: RapportRow = {
    id: id('rap'), actifId: r.actifId, periode: r.periode, version: r.version + 1, statut: 'BROUILLON', auteurId: c.id, verificateurId: null,
    publieParId: null, publieLe: null, contenu: { ...r.contenu }, motifCorrection: motif!.trim(), versionPrecedenteId: r.id, majLe: nowIso(),
  };
  db.rapports.push(next);
  db.transitions.push({ id: id('trn'), rapportId: next.id, de: null, vers: 'BROUILLON', parId: c.id, le: nowIso(), motif: next.motifCorrection });
  journal(r.actifId, c.id, 'RAPPORT_CORRIGE', `${r.periode} v${next.version}`);
  save();
  return rapportDto(next);
});

route('GET', '/rapports/:id/vue-investisseur', ({ me, params }) => {
  const c = me();
  const r = rapportOr404(params.id);
  guard(c, r.actifId);
  const pub = r.statut === 'PUBLIE' ? r : db.rapports.filter((x) => x.actifId === r.actifId && x.periode === r.periode && x.statut === 'PUBLIE').sort((a, b) => b.version - a.version)[0];
  if (!pub) throw err.introuvable('Aucune version publiée de ce rapport : les investisseurs ne voient rien pour l’instant.');
  const res: T.VueInvestisseurRapport = {
    actifNom: db.actifs.find((a) => a.id === pub.actifId)!.nom, periode: pub.periode, version: pub.version, publieLe: pub.publieLe!, contenu: pub.contenu,
    mention: 'Informations déclarées par le propriétaire et vérifiées par l’équipe financière FRACT. Les performances passées ne préjugent pas des performances futures.',
  };
  return res;
});

route('GET', '/actifs/:id/distributions', ({ me, params }) => {
  guard(me(), params.id);
  return db.distributions.filter((d) => d.actifId === params.id).sort((a, b) => b.declareeLe.localeCompare(a.declareeLe)).map((d): T.Distribution => ({
    ...d, montantAttribueCentimes: Math.round((d.montantDistribuableCentimes * d.pctParts) / 100),
  }));
});

route('POST', '/actifs/:id/distributions/simulation', ({ me, params, body: b }) => {
  guard(me(), params.id);
  const o = db.offres.find((x) => x.actifId === params.id);
  if (!o) throw err.conflit('SANS_OFFRE', 'Cet actif n’a pas d’offre : aucune part, donc aucune distribution à simuler.');
  const { montantDistribuableCentimes: m } = body<{ montantDistribuableCentimes?: number }>(b);
  if (!isInt(m) || m <= 0) throw err.invalide({ montantDistribuableCentimes: 'Le montant distribuable doit être un montant positif.' });
  if (m > 1e13) throw err.invalide({ montantDistribuableCentimes: 'Le montant distribuable est trop élevé.' });
  const attribue = Math.round((m * o.fractionPct) / 100);
  const parPart = Math.floor(attribue / o.nbParts);
  const res: T.SimulationDistribution = {
    montantDistribuableCentimes: m, pctParts: o.fractionPct, nbParts: o.nbParts, montantAttribueCentimes: attribue, parPartCentimes: parPart,
    exemple10PartsCentimes: parPart * 10,
    formule: 'Montant par part = montant distribuable × fraction proposée ÷ nombre de parts',
    mention: 'Simulation, hors frais et fiscalité. Rien n’est enregistré.',
  };
  return withStatus(200, res);
});

route('GET', '/actifs/:id/acces', ({ me, params }) => {
  guard(me(), params.id);
  return db.acces.filter((a) => a.actifId === params.id).map((a): T.AccesLigne => {
    const c = db.comptes.find((x) => x.id === a.compteId)!;
    return { id: a.id, compteNom: c.nom, compteEmail: c.email, role: a.role, caisseNom: db.caisses.find((x) => x.id === a.caisseId)?.nom ?? null, depuis: a.depuis };
  });
});

route('GET', '/actifs/:id/journal', ({ me, params, query }) => {
  guard(me(), params.id);
  const rows = db.journal.filter((j) => j.actifId === params.id).sort((a, b) => b.le.localeCompare(a.le));
  const page = Math.max(1, Number(query.page) || 1);
  const parPage = 30;
  const res: T.Page<T.JournalLigne> = {
    items: rows.slice((page - 1) * parPage, page * parPage).map((j) => ({ id: j.id, auteurNom: nom(j.auteurId) ?? 'Système', action: j.action, objet: j.objet, le: j.le })),
    page, parPage, total: rows.length, pages: Math.max(1, Math.ceil(rows.length / parPage)),
  };
  return res;
});

function operateurOf(caisseId: string) {
  return db.acces.find((a) => a.caisseId === caisseId && a.role === 'OPERATEUR_CAISSE')?.compteId ?? 'systeme';
}

route('POST', '/demo/caisses/:id/synchroniser', ({ me, params }) => {
  const caisse = db.caisses.find((x) => x.id === params.id);
  if (!caisse) throw err.introuvable('Caisse introuvable.');
  guard(me(), caisse.actifId);
  const op = operateurOf(caisse.id);
  const t = Date.now();
  const batch: T.VenteContenu[] = Array.from({ length: 4 }, (_, i) => ({
    venteUuid: uuid(Math.random), dateVente: new Date(t - (4 - i) * 90_000).toISOString(),
    montantCentimes: 500 + Math.floor(Math.random() * 18_000), moyenPaiement: Math.random() < 0.7 ? 'CARTE' : 'ESPECES',
  }));
  batch.push({ ...batch[2] });
  let creees = 0;
  let deja = 0;
  for (const v of batch) (recevoirVente(caisse.id, v, op).status === 201 ? creees++ : deja++);
  return withStatus(200, { message: `${caisse.nom} : 5 ventes envoyées, ${creees} créées, ${deja} doublon reconnu et ignoré.` } satisfies T.DemoResultat);
});

route('POST', '/demo/caisses/:id/conflit', ({ me, params }) => {
  const caisse = db.caisses.find((x) => x.id === params.id);
  if (!caisse) throw err.introuvable('Caisse introuvable.');
  guard(me(), caisse.actifId);
  const v = [...db.ventes].reverse().find((x) => x.caisseId === caisse.id);
  if (!v) throw err.conflit('SANS_VENTE', 'Cette caisse n’a encore aucune vente.');
  try {
    recevoirVente(caisse.id, { ...venteContenu(v), montantCentimes: v.montantCentimes + 1250 }, operateurOf(caisse.id));
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) return withStatus(200, { message: `${caisse.nom} : UUID ${v.venteUuid.slice(0, 8)}… renvoyé avec un autre montant. Vente d’origine inchangée, conflit enregistré.` } satisfies T.DemoResultat);
    throw e;
  }
  return withStatus(200, { message: 'Aucun conflit produit.' });
});

for (const action of ['confirmer', 'echouer'] as const) {
  route('POST', `/demo/registre/:operationId/${action}`, ({ me, params }) => {
    const c = me();
    const op = db.operations.find((x) => x.id === params.operationId);
    if (!op) throw err.introuvable('Opération introuvable.');
    const s = db.souscriptions.find((x) => x.id === op.souscriptionId)!;
    guard(c, db.offres.find((o) => o.id === s.offreId)!.actifId);
    if (op.statut !== 'EN_ATTENTE') throw err.conflit('OPERATION_TERMINEE', 'Cette opération n’est plus en attente.');
    settle(op.id, action === 'confirmer' ? 'CONFIRMEE' : 'ECHOUEE', c.id);
    save();
    return withStatus(200, { message: `Opération ${op.txHash.slice(0, 10)}… ${action === 'confirmer' ? 'confirmée' : 'marquée en échec'} (${op.quantite} parts).` } satisfies T.DemoResultat);
  });
}

route('POST', '/demo/reset', ({ me }) => {
  me();
  resetMockDb();
  return withStatus(200, { message: 'Les données de démonstration ont été remises à zéro.' } satisfies T.DemoResultat);
});
