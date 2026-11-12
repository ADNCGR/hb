import { format, formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import type * as T from '@/api/types';

const eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('fr-FR');
const pct1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export function euros(centimes: number | null | undefined, opts: { cents?: boolean } = {}) {
  if (centimes === null || centimes === undefined) return '-';
  return opts.cents || centimes % 100 !== 0 ? eur2.format(centimes / 100) : eur0.format(centimes / 100);
}

export const eurosArrondis = (centimes: number) => eur0.format(Math.round(centimes / 100));
export const nombre = (n: number) => num.format(n);
export const pourcent = (n: number) => `${pct1.format(n)} %`;

const d = (v: string | Date) => (typeof v === 'string' ? new Date(v) : v);
const premier = (s: string) => s.replace(/^1 /, '1er ');
export const dateCourte = (v: string | Date) => premier(format(d(v), 'd MMM yyyy', { locale: fr }));
export const dateHeure = (v: string | Date) => premier(format(d(v), "d MMM yyyy 'à' HH:mm", { locale: fr }));
export const moisCourt = (yyyyMm: string) => format(new Date(`${yyyyMm}-01T12:00:00`), 'MMM yy', { locale: fr });
export const moisLong = (yyyyMm: string) => format(new Date(`${yyyyMm}-01T12:00:00`), 'MMMM yyyy', { locale: fr });
export function ilYa(v: string | Date) {
  const h = (Date.now() - d(v).getTime()) / 3600_000;
  const unit = h < 1 ? 'minute' : h < 48 ? 'hour' : 'day';
  return `il y a ${formatDistanceToNowStrict(d(v), { locale: fr, unit, roundingMethod: 'floor' })}`;
}
export const isoJour = (v: Date) => format(v, 'yyyy-MM-dd');

export function taille(octets: number) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}

export const court = (s: string, n = 10) => (s.length > n + 4 ? `${s.slice(0, n)}…${s.slice(-4)}` : s);

export const ROLE: Record<T.Role, string> = {
  PROPRIETAIRE: 'Propriétaire',
  OPERATEUR_CAISSE: 'Opérateur de caisse',
  FINANCE_AUTEUR: 'Finance (auteur)',
  FINANCE_VERIFICATEUR: 'Finance (vérification)',
  FINANCE_PUBLICATION: 'Finance (publication)',
  ADMIN: 'Administrateur',
};

export const TYPE_ACTIF: Record<T.TypeActif, string> = { COMMERCE: 'Commerce', IMMOBILIER: 'Immobilier', ENTREPRISE: 'Entreprise' };
export const STATUT_ACTIF: Record<T.StatutActif, string> = { PREPARATION: 'En préparation', LEVEE_EN_COURS: 'Levée en cours', FINANCE: 'Financé' };
export const STATUT_OFFRE: Record<T.StatutOffre, string> = { BROUILLON: 'Brouillon', OUVERTE: 'Ouverte', CLOTUREE: 'Clôturée' };
export const STATUT_OPERATION: Record<T.StatutOperation, string> = { EN_ATTENTE: 'En attente', CONFIRMEE: 'Confirmée', ECHOUEE: 'Échouée' };
export const TYPE_OPERATION: Record<T.TypeOperation, string> = { EMISSION: 'Émission', ATTRIBUTION: 'Attribution', TRANSFERT: 'Transfert' };
export const MOYEN: Record<T.MoyenPaiement, string> = { CARTE: 'Carte', ESPECES: 'Espèces', AUTRE: 'Autre' };
export const STATUT_ECRITURE: Record<T.StatutEcriture, string> = { A_CONTROLER: 'À contrôler', CONTROLEE: 'Contrôlée', REJETEE: 'Rejetée' };
export const STATUT_RAPPORT: Record<T.StatutRapport, string> = { BROUILLON: 'Brouillon', SOUMIS: 'Soumis', VALIDE: 'Validé', PUBLIE: 'Publié' };
export const STATUT_DEMANDE: Record<T.StatutDemande, string> = { OUVERTE: 'Ouverte', REPONDUE: 'Répondue' };

export const ACTION_JOURNAL: Record<string, string> = {
  ACTIF_CREE: 'Actif créé',
  OFFRE_MODIFIEE: 'Offre modifiée',
  OFFRE_OUVERTE: 'Offre ouverte',
  OFFRE_CLOTUREE: 'Offre clôturée',
  OPERATION_CONFIRMEE: 'Opération de registre confirmée',
  OPERATION_ECHOUEE: 'Opération de registre échouée',
  VENTE_RECUE: 'Vente reçue',
  VENTE_CONFLIT: 'Conflit de vente',
  VENTES_IMPORTEES: 'Import de ventes',
  ECRITURE_CREEE: 'Écriture saisie',
  ECRITURE_CONTROLEE: 'Écriture contrôlée',
  ECRITURE_REJETEE: 'Écriture rejetée',
  ECRITURE_CORRIGEE: 'Écriture corrigée',
  DOCUMENT_DEPOSE: 'Document déposé',
  DEMANDE_PIECE_CREEE: 'Pièce demandée',
  DEMANDE_PIECE_REPONDUE: 'Pièce fournie',
  RAPPORT_CREE: 'Rapport créé',
  RAPPORT_MODIFIE: 'Rapport modifié',
  RAPPORT_SOUMIS: 'Rapport soumis',
  RAPPORT_VALIDE: 'Rapport validé',
  RAPPORT_REFUSE: 'Rapport refusé',
  RAPPORT_PUBLIE: 'Rapport publié',
  RAPPORT_CORRIGE: 'Correction de rapport',
  DISTRIBUTION_DECLAREE: 'Distribution déclarée',
};

export function parseEuros(input: string): number | null {
  const s = input.replace(/[\s  €]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export const centimesVersSaisie = (c: number) => (c / 100).toFixed(2).replace('.', ',').replace(/,00$/, '');
