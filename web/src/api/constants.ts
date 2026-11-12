export const CATEGORIES_ECRITURE = [
  'Loyer', 'Salaires', 'Achats marchandises', 'Énergie', 'Marketing', 'Maintenance', 'Honoraires', 'Assurances',
  'Travaux', 'Éclairage', 'Signalétique', 'Stock', 'Fonds de roulement', 'Taxes', 'Autre',
] as const;

export const CATEGORIES_DOCUMENT = ['Facture', 'Contrat', 'Juridique', 'Banque', 'Assurance', 'Rapport', 'Photo', 'Autre'] as const;

export const FORMATS_DOCUMENT = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const TAILLE_MAX_DOCUMENT = 10 * 1024 * 1024;
