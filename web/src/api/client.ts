import { API_MODE, request, requestFile } from './transport';
import type * as T from './types';

const enc = encodeURIComponent;

export const api = {
  auth: {
    login: (email: string, motDePasse: string) => request<T.LoginResponse>('POST', '/auth/login', { body: { email, motDePasse }, auth: false }),
    me: () => request<T.Me>('GET', '/auth/me'),
  },
  actifs: {
    list: () => request<T.ActifListItem[]>('GET', '/actifs'),
    create: (b: T.ActifCreation) => request<T.ActifListItem>('POST', '/actifs', { body: b }),
    get: (id: string) => request<T.ActifListItem>('GET', `/actifs/${enc(id)}`),
    tableauDeBord: (id: string) => request<T.TableauDeBord>('GET', `/actifs/${enc(id)}/tableau-de-bord`),
  },
  offre: {
    get: (actifId: string) => request<T.Offre>('GET', `/actifs/${enc(actifId)}/offre`),
    put: (actifId: string, b: T.OffreBrouillon) => request<T.Offre>('PUT', `/actifs/${enc(actifId)}/offre`, { body: b }),
    usageFonds: (actifId: string) => request<T.UsageFonds>('GET', `/actifs/${enc(actifId)}/usage-fonds`),
    investisseurs: (actifId: string) => request<T.VueInvestisseurs>('GET', `/actifs/${enc(actifId)}/investisseurs`),
    registre: (actifId: string) => request<T.Registre>('GET', `/actifs/${enc(actifId)}/registre`),
  },
  ventes: {
    caisses: (actifId: string) => request<T.Caisse[]>('GET', `/actifs/${enc(actifId)}/caisses`),
    list: (actifId: string, q: { debut?: string; fin?: string; caisseId?: string; page?: number }) =>
      request<T.VentesPage>('GET', `/actifs/${enc(actifId)}/ventes`, { query: q }),
    conflits: (actifId: string) => request<T.ConflitVente[]>('GET', `/actifs/${enc(actifId)}/ventes/conflits`),
    async importer(actifId: string, fichier: File) {
      if (API_MODE === 'mock') return request<T.BilanImport>('POST', `/actifs/${enc(actifId)}/ventes/import`, { body: { contenu: await fichier.text() } });
      const fd = new FormData();
      fd.append('fichier', fichier);
      return request<T.BilanImport>('POST', `/actifs/${enc(actifId)}/ventes/import`, { body: fd });
    },
  },
  ecritures: {
    list: (actifId: string, statut?: T.StatutEcriture) => request<T.Ecriture[]>('GET', `/actifs/${enc(actifId)}/ecritures`, { query: { statut } }),
    create: (actifId: string, b: T.EcritureCreation) => request<T.Ecriture>('POST', `/actifs/${enc(actifId)}/ecritures`, { body: b }),
    controle: (id: string, b: T.EcritureControle) => request<T.Ecriture>('POST', `/ecritures/${enc(id)}/controle`, { body: b }),
    correction: (id: string, b: T.EcritureCreation) => request<T.Ecriture>('POST', `/ecritures/${enc(id)}/correction`, { body: b }),
  },
  documents: {
    list: (actifId: string) => request<T.DocumentFichier[]>('GET', `/actifs/${enc(actifId)}/documents`),
    deposer: (actifId: string, fichier: File, categorie: string, ecritureId?: string | null) => {
      const fd = new FormData();
      fd.append('fichier', fichier);
      fd.append('categorie', categorie);
      if (ecritureId) fd.append('ecritureId', ecritureId);
      return request<T.DocumentFichier>('POST', `/actifs/${enc(actifId)}/documents`, { body: fd });
    },
    fichier: (id: string) => requestFile(`/documents/${enc(id)}/fichier`),
    demandes: (actifId: string) => request<T.DemandePiece[]>('GET', `/actifs/${enc(actifId)}/demandes-pieces`),
    repondre: (demandeId: string, documentId: string) => request<{ ok: true }>('POST', `/demandes-pieces/${enc(demandeId)}/reponse`, { body: { documentId } }),
  },
  rapports: {
    list: (actifId: string) => request<T.Rapport[]>('GET', `/actifs/${enc(actifId)}/rapports`),
    get: (id: string) => request<T.RapportDetail>('GET', `/rapports/${enc(id)}`),
    preRemplissage: (actifId: string, periode: string) =>
      request<Pick<T.ContenuRapport, 'caCentimes' | 'chargesCentimes' | 'resultatCentimes'>>('GET', `/actifs/${enc(actifId)}/rapports/pre-remplissage`, { query: { periode } }),
    create: (actifId: string, b: T.RapportCreation) => request<T.Rapport>('POST', `/actifs/${enc(actifId)}/rapports`, { body: b }),
    patch: (id: string, b: T.ContenuRapport) => request<T.Rapport>('PATCH', `/rapports/${enc(id)}`, { body: b }),
    soumettre: (id: string) => request<T.Rapport>('POST', `/rapports/${enc(id)}/soumettre`),
    valider: (id: string) => request<T.Rapport>('POST', `/rapports/${enc(id)}/valider`),
    refuser: (id: string, motif: string) => request<T.Rapport>('POST', `/rapports/${enc(id)}/refuser`, { body: { motif } }),
    publier: (id: string) => request<T.Rapport>('POST', `/rapports/${enc(id)}/publier`),
    corriger: (id: string, motif: string) => request<T.Rapport>('POST', `/rapports/${enc(id)}/corriger`, { body: { motif } }),
    vueInvestisseur: (id: string) => request<T.VueInvestisseurRapport>('GET', `/rapports/${enc(id)}/vue-investisseur`),
  },
  distributions: {
    list: (actifId: string) => request<T.Distribution[]>('GET', `/actifs/${enc(actifId)}/distributions`),
    simuler: (actifId: string, montantDistribuableCentimes: number) =>
      request<T.SimulationDistribution>('POST', `/actifs/${enc(actifId)}/distributions/simulation`, { body: { montantDistribuableCentimes } }),
  },
  acces: {
    list: (actifId: string) => request<T.AccesLigne[]>('GET', `/actifs/${enc(actifId)}/acces`),
  },
  journal: {
    list: (actifId: string, page = 1) => request<T.Page<T.JournalLigne>>('GET', `/actifs/${enc(actifId)}/journal`, { query: { page } }),
  },
  demo: {
    synchroniser: (caisseId: string) => request<T.DemoResultat>('POST', `/demo/caisses/${enc(caisseId)}/synchroniser`),
    conflit: (caisseId: string) => request<T.DemoResultat>('POST', `/demo/caisses/${enc(caisseId)}/conflit`),
    confirmer: (operationId: string) => request<T.DemoResultat>('POST', `/demo/registre/${enc(operationId)}/confirmer`),
    echouer: (operationId: string) => request<T.DemoResultat>('POST', `/demo/registre/${enc(operationId)}/echouer`),
    reset: () => request<T.DemoResultat>('POST', '/demo/reset'),
  },
};
