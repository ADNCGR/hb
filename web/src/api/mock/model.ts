import type {
  MoyenPaiement, Role, StatutActif, StatutCompte, StatutDemande, StatutEcriture,
  StatutOffre, StatutOperation, StatutRapport, TypeActif, TypeOperation, ContenuRapport, VenteContenu,
} from '../types';

export interface CompteRow { id: string; email: string; nom: string; motDePasse: string; statut: StatutCompte; creeLe: string }
export interface AccesActifRow { id: string; compteId: string; actifId: string; role: Role; caisseId: string | null; depuis: string }
export interface ActifRow { id: string; proprietaireId: string; nom: string; type: TypeActif; ville: string; adresse: string; description: string; statut: StatutActif }
export interface OffreRow {
  id: string; actifId: string; valeurReferenceCentimes: number; dateValeur: string; fractionPct: number; prixPartCentimes: number;
  nbParts: number; droits: string; conditionsDistribution: string; conditionsTransfert: string; ouverture: string; cloture: string; statut: StatutOffre;
}
export interface EnveloppeRow { id: string; offreId: string; libelle: string; montantPrevuCentimes: number }
export interface SouscriptionRow { id: string; offreId: string; investisseurRef: string; quantite: number; statut: StatutOperation; creeLe: string }
export interface OperationRow {
  id: string; souscriptionId: string; type: TypeOperation; quantite: number; txHash: string; statut: StatutOperation;
  confirmations: number; envoyeeLe: string; confirmeeLe: string | null;
}
export interface CaisseRow { id: string; actifId: string; nom: string; appareil: string; derniereSyncLe: string | null }
export interface VenteRow { id: string; caisseId: string; venteUuid: string; dateVente: string; recueLe: string; montantCentimes: number; moyenPaiement: MoyenPaiement }
export interface ConflitRow { id: string; caisseId: string; venteUuid: string; contenuRecu: VenteContenu; recuLe: string }
export interface EcritureRow {
  id: string; actifId: string; date: string; categorie: string; montantCentimes: number; fournisseur: string; enveloppeId: string | null;
  documentId: string | null; statut: StatutEcriture; motifRejet: string | null; verrouillee: boolean; corrigeId: string | null; auteurId: string;
}
export interface DocumentRow {
  id: string; actifId: string; nom: string; categorie: string; mime: string; taille: number; chemin: string; auteurId: string;
  deposeLe: string; ecritureId: string | null; rapportId: string | null;
}
export interface DemandeRow {
  id: string; actifId: string; demandeurId: string; objet: string; statut: StatutDemande; documentId: string | null; creeLe: string;
  echeance: string; ecritureId: string | null;
}
export interface RapportRow {
  id: string; actifId: string; periode: string; version: number; statut: StatutRapport; auteurId: string; verificateurId: string | null;
  publieParId: string | null; publieLe: string | null; contenu: ContenuRapport; motifCorrection: string | null; versionPrecedenteId: string | null; majLe: string;
}
export interface TransitionRow { id: string; rapportId: string; de: StatutRapport | null; vers: StatutRapport; parId: string; le: string; motif: string | null }
export interface DistributionRow { id: string; actifId: string; periode: string; montantDistribuableCentimes: number; pctParts: number; parPartCentimes: number; declareeLe: string }
export interface JournalRow { id: string; actifId: string; auteurId: string; action: string; objet: string; le: string }

export interface Db {
  version: number;
  comptes: CompteRow[];
  acces: AccesActifRow[];
  actifs: ActifRow[];
  offres: OffreRow[];
  enveloppes: EnveloppeRow[];
  souscriptions: SouscriptionRow[];
  operations: OperationRow[];
  caisses: CaisseRow[];
  ventes: VenteRow[];
  conflits: ConflitRow[];
  ecritures: EcritureRow[];
  documents: DocumentRow[];
  demandes: DemandeRow[];
  rapports: RapportRow[];
  transitions: TransitionRow[];
  distributions: DistributionRow[];
  journal: JournalRow[];
}
