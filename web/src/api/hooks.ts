import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export const keys = {
  me: ['me'] as const,
  actifs: ['actifs'] as const,
  actif: (id: string) => ['actif', id] as const,
  part: (id: string, part: string, ...rest: unknown[]) => ['actif', id, part, ...rest] as const,
  rapport: (id: string) => ['rapport', id] as const,
};

export const useMe = (enabled = true) => useQuery({ queryKey: keys.me, queryFn: api.auth.me, enabled, staleTime: 60_000 });
export const useActifs = () => useQuery({ queryKey: keys.actifs, queryFn: api.actifs.list });
export const useActif = (id: string) => useQuery({ queryKey: keys.actif(id), queryFn: () => api.actifs.get(id) });
export const useTableauDeBord = (id: string) => useQuery({ queryKey: keys.part(id, 'tdb'), queryFn: () => api.actifs.tableauDeBord(id), refetchInterval: 30_000 });
export const useOffre = (id: string) => useQuery({ queryKey: keys.part(id, 'offre'), queryFn: () => api.offre.get(id), refetchInterval: 15_000 });
export const useUsageFonds = (id: string, enabled = true) => useQuery({ queryKey: keys.part(id, 'usage'), queryFn: () => api.offre.usageFonds(id), enabled });
export const useInvestisseurs = (id: string) => useQuery({ queryKey: keys.part(id, 'investisseurs'), queryFn: () => api.offre.investisseurs(id) });
export const useRegistre = (id: string) => useQuery({ queryKey: keys.part(id, 'registre'), queryFn: () => api.offre.registre(id), refetchInterval: 5_000 });
export const useCaisses = (id: string) => useQuery({ queryKey: keys.part(id, 'caisses'), queryFn: () => api.ventes.caisses(id) });
export const useVentes = (id: string, q: { debut?: string; fin?: string; caisseId?: string; page?: number }) =>
  useQuery({ queryKey: keys.part(id, 'ventes', q), queryFn: () => api.ventes.list(id, q), placeholderData: keepPreviousData });
export const useConflits = (id: string) => useQuery({ queryKey: keys.part(id, 'conflits'), queryFn: () => api.ventes.conflits(id) });
export const useEcritures = (id: string) => useQuery({ queryKey: keys.part(id, 'ecritures'), queryFn: () => api.ecritures.list(id) });
export const useDocuments = (id: string) => useQuery({ queryKey: keys.part(id, 'documents'), queryFn: () => api.documents.list(id) });
export const useDemandes = (id: string) => useQuery({ queryKey: keys.part(id, 'demandes'), queryFn: () => api.documents.demandes(id) });
export const useRapports = (id: string) => useQuery({ queryKey: keys.part(id, 'rapports'), queryFn: () => api.rapports.list(id) });
export const useRapport = (id: string) => useQuery({ queryKey: keys.rapport(id), queryFn: () => api.rapports.get(id) });
export const useVueInvestisseur = (id: string, enabled: boolean) =>
  useQuery({ queryKey: [...keys.rapport(id), 'vue'], queryFn: () => api.rapports.vueInvestisseur(id), enabled, retry: false });
export const useDistributions = (id: string) => useQuery({ queryKey: keys.part(id, 'distributions'), queryFn: () => api.distributions.list(id) });
export const useAcces = (id: string) => useQuery({ queryKey: keys.part(id, 'acces'), queryFn: () => api.acces.list(id) });
export const useJournal = (id: string, page: number) =>
  useQuery({ queryKey: keys.part(id, 'journal', page), queryFn: () => api.journal.list(id, page), placeholderData: keepPreviousData });

export function useActifMutation<V, R>(actifId: string | null, fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      if (actifId) qc.invalidateQueries({ queryKey: keys.actif(actifId) });
      qc.invalidateQueries({ queryKey: ['rapport'] });
      qc.invalidateQueries({ queryKey: keys.actifs });
    },
  });
}

