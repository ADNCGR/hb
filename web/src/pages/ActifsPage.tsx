import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { api } from '@/api/client';
import { isApiError } from '@/api/errors';
import { useActifMutation, useActifs } from '@/api/hooks';
import type { StatutActif } from '@/api/types';
import { PageHeader } from '@/components/common';
import { EmptyState, Q, SkeletonBlock } from '@/components/states';
import { useToast } from '@/components/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/form';
import { Icon } from '@/components/ui/Icon';
import { ROLE, STATUT_ACTIF, TYPE_ACTIF } from '@/lib/format';

const schema = z.object({
  nom: z.string().trim().min(2, 'Le nom doit faire au moins 2 caractères.').max(80, 'Le nom doit faire au plus 80 caractères.'),
  type: z.enum(['COMMERCE', 'IMMOBILIER', 'ENTREPRISE'], { errorMap: () => ({ message: 'Choisissez un type.' }) }),
  ville: z.string().trim().min(2, 'La ville est obligatoire.'),
  adresse: z.string().trim().min(4, 'L’adresse est obligatoire.'),
  description: z.string().max(2000, 'La description doit faire au plus 2 000 caractères.'),
});
type Form = z.infer<typeof schema>;

const statutTone: Record<StatutActif, 'ok' | 'wait' | 'neutral'> = { FINANCE: 'ok', LEVEE_EN_COURS: 'wait', PREPARATION: 'neutral' };

export function ActifsPage() {
  const q = useActifs();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader
        title="Mes actifs"
        sub="Les actifs auxquels votre compte a accès"
        donneesAu={q.dataUpdatedAt || null}
        actions={<Button dot onClick={() => setOpen(true)}>Créer un actif</Button>}
      />
      <Q
        query={q}
        skeleton={<SkeletonBlock rows={4} />}
        empty={(d) => d.length === 0 && <EmptyState icon="home" title="Aucun actif pour l’instant" action={<Button onClick={() => setOpen(true)}>Créer un actif</Button>}>Créez votre premier actif pour préparer une offre.</EmptyState>}
      >
        {(actifs) => (
          <ul className="grid gap-2">
            {actifs.map((a) => (
              <li key={a.id}>
                <Link to={`/actifs/${a.id}`} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 rounded-row border border-line px-4 py-3 transition-colors hover:border-line-2 sm:grid-cols-[48px_minmax(0,1fr)_auto_auto]">
                  <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-surface-2 font-heading text-[17px] font-semibold" aria-hidden="true">{a.nom.slice(0, 1)}</span>
                  <span className="min-w-0">
                    <b className="block truncate font-heading text-[15.5px] font-semibold">{a.nom}</b>
                    <small className="block truncate text-[13.5px] text-muted">{TYPE_ACTIF[a.type]} à {a.ville} ({a.mesRoles.map((r) => ROLE[r]).join(', ').toLowerCase()})</small>
                  </span>
                  <Badge tone={statutTone[a.statut]} dot className="max-sm:hidden">{STATUT_ACTIF[a.statut]}</Badge>
                  <Icon name="arrow" className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Q>
      <CreateActif open={open} onOpenChange={setOpen} />
    </>
  );
}

function CreateActif({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const m = useActifMutation(null, api.actifs.create);
  const { register, handleSubmit, reset, setError: setFieldError, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema), defaultValues: { nom: '', type: 'COMMERCE', ville: '', adresse: '', description: '' },
  });
  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      const a = await m.mutateAsync(v);
      toast(`L’actif « ${a.nom} » est créé. Vous en êtes le propriétaire.`);
      reset();
      onOpenChange(false);
      navigate(`/actifs/${a.id}/levee`);
    } catch (e) {
      if (isApiError(e) && e.details) Object.entries(e.details).forEach(([k, msg]) => setFieldError(k as keyof Form, { message: msg }));
      setError(isApiError(e) ? e.message : 'La création a échoué.');
    }
  });
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Créer un actif"
      description="L’actif est créé en préparation. Vous pourrez ensuite rédiger le brouillon de son offre."
      footer={<><Button variant="quiet" onClick={() => onOpenChange(false)}>Annuler</Button><Button form="create-actif" type="submit" loading={m.isPending}>Créer l’actif</Button></>}
    >
      <form id="create-actif" onSubmit={submit} noValidate className="grid gap-4">
        <FormError message={error} />
        <Field label="Nom" error={errors.nom?.message}><Input {...register('nom')} placeholder="Boutique Nova" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" error={errors.type?.message}>
            <Select {...register('type')}>
              {Object.entries(TYPE_ACTIF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Ville" error={errors.ville?.message}><Input {...register('ville')} placeholder="Rabat" /></Field>
        </div>
        <Field label="Adresse" error={errors.adresse?.message}><Input {...register('adresse')} /></Field>
        <Field label="Description" optional error={errors.description?.message}><Textarea {...register('description')} /></Field>
      </form>
    </Dialog>
  );
}
