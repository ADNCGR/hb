import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { isApiError } from '@/api/errors';
import { DEMO_MODE } from '@/api/transport';
import { useAuth } from '@/auth/AuthContext';
import { Notice } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input } from '@/components/ui/form';
import { Logo } from '@/layout/AppLayout';

const schema = z.object({
  email: z.string().trim().min(1, 'Saisissez votre adresse e-mail.').email('Adresse e-mail invalide.'),
  motDePasse: z.string().min(1, 'Saisissez votre mot de passe.'),
});
type Form = z.infer<typeof schema>;

const DEMO = [
  ['proprietaire@fract.test', 'Propriétaire (Atlas Retail, Boutique Nova)'],
  ['proprietaire.b@fract.test', 'Propriétaire (Urban Market)'],
  ['auteur@fract.test', 'Finance, auteur'],
  ['verificateur@fract.test', 'Finance, vérificateur'],
  ['publication@fract.test', 'Finance, publication'],
  ['caisse@fract.test', 'Opérateur de caisse'],
  ['suspendu@fract.test', 'Compte suspendu'],
];

export function LoginPage() {
  const { token, login, expiredNotice } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: '', motDePasse: '' } });

  if (token) return <Navigate to="/actifs" replace />;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await login(v.email, v.motDePasse);
      const from = (loc.state as { from?: string } | null)?.from;
      navigate(from && from !== '/connexion' ? from : '/actifs', { replace: true });
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Connexion impossible. Réessayez.');
    }
  });

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid place-items-center px-6 py-12">
        <form onSubmit={onSubmit} noValidate className="grid w-full max-w-[380px] gap-[18px]">
          <Logo className="text-[26px]" />
          <div>
            <h1 className="text-[28px]">Espace propriétaire</h1>
            <p className="mt-1 text-[14.5px] text-muted">Connectez-vous pour accéder à vos actifs.</p>
          </div>
          {expiredNotice ? <Notice tone="wait" icon="clock">Votre session a expiré. Reconnectez-vous.</Notice> : null}
          <FormError message={error} />
          <Field label="Adresse e-mail" error={errors.email?.message}>
            <Input type="email" autoComplete="username" placeholder="vous@exemple.fr" {...register('email')} />
          </Field>
          <Field label="Mot de passe" error={errors.motDePasse?.message}>
            <Input type="password" autoComplete="current-password" {...register('motDePasse')} />
          </Field>
          <Button type="submit" loading={isSubmitting} className="w-full">Se connecter</Button>
        </form>
      </div>
      <aside className="hidden border-l border-line bg-surface px-[clamp(32px,5vw,72px)] py-12 lg:flex lg:flex-col lg:justify-center">
        <p className="kicker">Financement fractionné d’actifs réels</p>
        <h2 className="mt-3 max-w-[16ch] font-heading text-[clamp(30px,3.4vw,46px)] font-semibold leading-[1.06] tracking-[-0.035em]">
          Suivi de votre actif <span className="text-muted-2">après la levée.</span>
        </h2>
        {DEMO_MODE ? (
          <div className="mt-10 max-w-[460px]">
            <p className="font-heading text-[13.5px] font-semibold">Comptes de démonstration</p>
            <p className="mt-1 text-[13.5px] text-muted">Mot de passe de tous les comptes : <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[13px] text-ink">Demo2026!</code></p>
            <ul className="mt-4 grid gap-1.5">
              {DEMO.map(([email, role]) => (
                <li key={email}>
                  <button
                    type="button"
                    onClick={() => { setValue('email', email); setValue('motDePasse', 'Demo2026!'); }}
                    className="flex w-full items-center justify-between gap-4 rounded-row border border-line bg-white px-4 py-2.5 text-left hover:border-line-2"
                  >
                    <span className="truncate text-[14px] font-medium">{email}</span>
                    <span className="flex-none text-[12.5px] text-muted">{role}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12.5px] text-muted">Toutes les données sont fictives. Aucun paiement réel.</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
