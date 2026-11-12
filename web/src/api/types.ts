export type Role =
  | 'PROPRIETAIRE'
  | 'OPERATEUR_CAISSE'
  | 'FINANCE_AUTEUR'
  | 'FINANCE_VERIFICATEUR'
  | 'FINANCE_PUBLICATION'
  | 'ADMIN';

export type StatutCompte = 'ACTIF' | 'SUSPENDU';
export type TypeActif = 'COMMERCE' | 'IMMOBILIER' | 'ENTREPRISE';
export type StatutActif = 'PREPARATION' | 'LEVEE_EN_COURS' | 'FINANCE';
export type StatutOffre = 'BROUILLON' | 'OUVERTE' | 'CLOTUREE';
export type StatutOperation = 'EN_ATTENTE' | 'CONFIRMEE' | 'ECHOUEE';
export type TypeOperation = 'EMISSION' | 'ATTRIBUTION' | 'TRANSFERT';
export type MoyenPaiement = 'CARTE' | 'ESPECES' | 'AUTRE';
export type StatutEcriture = 'A_CONTROLER' | 'CONTROLEE' | 'REJETEE';
export type StatutRapport = 'BROUILLON' | 'SOUMIS' | 'VALIDE' | 'PUBLIE';
export type StatutDemande = 'OUVERTE' | 'REPONDUE';

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export interface Compte {
  id: string;
  email: string;
  nom: string;
  statut: StatutCompte;
  creeLe: string;
}

export interface AccesResume {
  actifId: string;
  actifNom: string;
  role: Role;
  caisseId: string | null;
}

export interface Me {
  compte: Compte;
  acces: AccesResume[];
}

export interface LoginResponse {
  token: string;
  expireLe: string;
  compte: Compte;
}

export interface Actif {
  id: string;
  proprietaireId: string;
  nom: string;
  type: TypeActif;
  ville: string;
  adresse: string;
  description: string;
  statut: StatutActif;
}

export interface ActifListItem extends Actif {
  mesRoles: Role[];
}

export interface ActifCreation {
  nom: string;
  type: TypeActif;
  ville: string;
  adresse: string;
  description: string;
}

export interface PointMensuel {
  mois: string;
  caCentimes: number;
  chargesCentimes: number;
}

export interface EtatCaisse {
  id: string;
  nom: string;
  appareil: string;
  derniereSyncLe: string | null;
  heuresDepuisSync: number | null;
  enRetard: boolean;
}

export interface Echeance {
  date: string;
  libelle: string;
  type: 'RAPPORT' | 'PIECE' | 'DISTRIBUTION' | 'OFFRE' | 'TRIMESTRE';
  lien: string | null;
}

export interface RapportResume {
  id: string;
  periode: string;
  version: number;
  statut: StatutRapport;
  publieLe: string | null;
}

export interface TableauDeBord {
  donneesAu: string;
  trimestre: string;
  caTrimestreCentimes: number;
  chargesTrimestreCentimes: number;
  resultatProvisoireCentimes: number;
  resultatValide: false;
  tresorerieDeclareeCentimes: number | null;
  tresorerieSource: string | null;
  serie12Mois: PointMensuel[];
  levee: {
    statutOffre: StatutOffre | null;
    nbParts: number;
    prixPartCentimes: number;
    partsConfirmees: number;
    partsEnAttente: number;
    partsEchouees: number;
    capitalConfirmeCentimes: number;
    objectifCentimes: number;
  } | null;
  dernierRapportPublie: RapportResume | null;
  rapportEnCours: RapportResume | null;
  caisses: EtatCaisse[];
  echeances: Echeance[];
}

export interface Enveloppe {
  id: string;
  libelle: string;
  montantPrevuCentimes: number;
}

export interface Offre {
  id: string;
  actifId: string;
  valeurReferenceCentimes: number;
  dateValeur: string;
  fractionPct: number;
  prixPartCentimes: number;
  nbParts: number;
  droits: string;
  conditionsDistribution: string;
  conditionsTransfert: string;
  ouverture: string;
  cloture: string;
  statut: StatutOffre;
  enveloppes: Enveloppe[];
  montantLeveCentimes: number;
  capitalConfirmeCentimes: number;
  partsConfirmees: number;
  partsEnAttente: number;
  partsEchouees: number;
  modifiable: boolean;
}

export interface OffreBrouillon {
  valeurReferenceCentimes: number;
  dateValeur: string;
  fractionPct: number;
  prixPartCentimes: number;
  nbParts: number;
  droits: string;
  conditionsDistribution: string;
  conditionsTransfert: string;
  ouverture: string;
  cloture: string;
  enveloppes: { libelle: string; montantPrevuCentimes: number }[];
}

export interface UsageFonds {
  totalPrevuCentimes: number;
  totalDepenseCentimes: number;
  totalResteCentimes: number;
  enveloppes: {
    id: string;
    libelle: string;
    montantPrevuCentimes: number;
    depenseCentimes: number;
    resteCentimes: number;
    pctConsomme: number;
    depenses: { id: string; date: string; fournisseur: string; categorie: string; montantCentimes: number; statut: StatutEcriture }[];
  }[];
}

export interface VueInvestisseurs {
  nombre: number;
  partsConfirmees: number;
  tranches: { libelle: string; min: number; max: number | null; investisseurs: number; parts: number; pctParts: number }[];
  concentrations: { libelle: string; pctParts: number }[];
  principaux: { ref: string; parts: number; pctParts: number }[];
  avertissement: string;
}

export interface OperationRegistre {
  id: string;
  souscriptionId: string;
  investisseurRef: string;
  type: TypeOperation;
  quantite: number;
  txHash: string;
  statut: StatutOperation;
  confirmations: number;
  envoyeeLe: string;
  confirmeeLe: string | null;
  aRapprocher: boolean;
}

export interface Registre {
  resume: { confirmees: number; enAttente: number; echouees: number; aRapprocher: number };
  operations: OperationRegistre[];
}

export interface Caisse {
  id: string;
  actifId: string;
  nom: string;
  appareil: string;
  derniereSyncLe: string | null;
  heuresDepuisSync: number | null;
  enRetard: boolean;
  ventesAujourdhui: number;
}

export interface Vente {
  id: string;
  caisseId: string;
  caisseNom: string;
  venteUuid: string;
  dateVente: string;
  recueLe: string;
  montantCentimes: number;
  moyenPaiement: MoyenPaiement;
}

export interface Page<T> {
  items: T[];
  page: number;
  parPage: number;
  total: number;
  pages: number;
}

export interface VentesPage extends Page<Vente> {
  totalMontantCentimes: number;
}

export interface VenteContenu {
  venteUuid: string;
  dateVente: string;
  montantCentimes: number;
  moyenPaiement: MoyenPaiement;
}

export interface ConflitVente {
  id: string;
  caisseId: string;
  caisseNom: string;
  venteUuid: string;
  recuLe: string;
  contenuRecu: VenteContenu;
  venteExistante: VenteContenu | null;
  differences: (keyof VenteContenu)[];
}

export interface BilanImport {
  lignes: number;
  creees: number;
  dejaPresentes: number;
  conflits: number;
  invalides: { ligne: number; erreur: string }[];
}

export interface Ecriture {
  id: string;
  actifId: string;
  date: string;
  categorie: string;
  montantCentimes: number;
  fournisseur: string;
  enveloppeId: string | null;
  enveloppeLibelle: string | null;
  documentId: string | null;
  documentNom: string | null;
  statut: StatutEcriture;
  motifRejet: string | null;
  verrouillee: boolean;
  corrigeId: string | null;
  correctionIds: string[];
  auteurNom: string;
}

export interface EcritureCreation {
  date: string;
  categorie: string;
  montantCentimes: number;
  fournisseur: string;
  enveloppeId?: string | null;
  documentId?: string | null;
}

export interface EcritureControle {
  decision: 'CONTROLEE' | 'REJETEE';
  motif?: string;
}

export interface DocumentFichier {
  id: string;
  actifId: string;
  nom: string;
  categorie: string;
  mime: string;
  taille: number;
  auteurNom: string;
  deposeLe: string;
  ecritureId: string | null;
  rapportId: string | null;
}

export interface DemandePiece {
  id: string;
  actifId: string;
  demandeurNom: string;
  objet: string;
  statut: StatutDemande;
  documentId: string | null;
  documentNom: string | null;
  creeLe: string;
  echeance: string;
  ecritureId: string | null;
}

export interface ContenuRapport {
  caCentimes: number;
  chargesCentimes: number;
  resultatCentimes: number;
  tresorerieCentimes: number;
  dettesCentimes: number;
  faitsMarquants: string;
}

export interface Rapport {
  id: string;
  actifId: string;
  periode: string;
  version: number;
  statut: StatutRapport;
  auteurId: string;
  auteurNom: string;
  verificateurId: string | null;
  verificateurNom: string | null;
  publieParId: string | null;
  publieParNom: string | null;
  publieLe: string | null;
  contenu: ContenuRapport;
  motifCorrection: string | null;
  versionPrecedenteId: string | null;
  majLe: string;
}

export interface TransitionRapport {
  id: string;
  rapportId: string;
  version: number;
  de: StatutRapport | null;
  vers: StatutRapport;
  parNom: string;
  le: string;
  motif: string | null;
}

export interface RapportDetail extends Rapport {
  transitions: TransitionRapport[];
  versions: Rapport[];
  actionsPermises: ('MODIFIER' | 'SOUMETTRE' | 'VALIDER' | 'REFUSER' | 'PUBLIER' | 'CORRIGER')[];
}

export interface RapportCreation {
  periode: string;
  contenu: ContenuRapport;
}

export interface VueInvestisseurRapport {
  actifNom: string;
  periode: string;
  version: number;
  publieLe: string;
  contenu: ContenuRapport;
  mention: string;
}

export interface Distribution {
  id: string;
  actifId: string;
  periode: string;
  montantDistribuableCentimes: number;
  pctParts: number;
  montantAttribueCentimes: number;
  parPartCentimes: number;
  declareeLe: string;
}

export interface SimulationDistribution {
  montantDistribuableCentimes: number;
  pctParts: number;
  nbParts: number;
  montantAttribueCentimes: number;
  parPartCentimes: number;
  exemple10PartsCentimes: number;
  formule: string;
  mention: string;
}

export interface AccesLigne {
  id: string;
  compteNom: string;
  compteEmail: string;
  role: Role;
  caisseNom: string | null;
  depuis: string;
}

export interface JournalLigne {
  id: string;
  auteurNom: string;
  action: string;
  objet: string;
  le: string;
}

export interface DemoResultat {
  message: string;
}
