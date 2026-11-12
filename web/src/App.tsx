import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ToastProvider } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { AppLayout, Logo } from '@/layout/AppLayout';
import { Forbidden, NotFoundBlock, SkeletonBlock } from '@/components/states';
import { LoginPage } from '@/pages/LoginPage';
import { ActifsPage } from '@/pages/ActifsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LeveePage } from '@/pages/LeveePage';
import { InvestisseursPage } from '@/pages/InvestisseursPage';
import { RegistrePage } from '@/pages/RegistrePage';
import { VentesPage } from '@/pages/VentesPage';
import { ChargesPage } from '@/pages/ChargesPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { RapportsPage } from '@/pages/RapportsPage';
import { RapportDetailPage } from '@/pages/RapportDetailPage';
import { DistributionsPage } from '@/pages/DistributionsPage';
import { AccesPage } from '@/pages/AccesPage';
import { JournalPage } from '@/pages/JournalPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, loading, suspended, logout } = useAuth();
  const loc = useLocation();
  if (suspended) {
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <div className="w-full max-w-[420px]">
          <Logo />
          <p className="kicker mt-8">Erreur 423</p>
          <h1 className="mt-2 text-[28px]">Compte suspendu</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">Ce compte est suspendu : aucune donnée ne peut être consultée ni modifiée. Contactez l’équipe FRACT pour le réactiver.</p>
          <Button className="mt-6" onClick={logout}>Se déconnecter</Button>
        </div>
      </div>
    );
  }
  if (!token) return <Navigate to="/connexion" replace state={{ from: loc.pathname }} />;
  if (loading) return <div className="mx-auto max-w-[1240px] p-10"><SkeletonBlock rows={6} /></div>;
  return <>{children}</>;
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/actifs" replace />} />
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/actifs" element={<ActifsPage />} />
            <Route path="/actifs/:actifId">
              <Route index element={<DashboardPage />} />
              <Route path="levee" element={<LeveePage />} />
              <Route path="investisseurs" element={<InvestisseursPage />} />
              <Route path="registre" element={<RegistrePage />} />
              <Route path="ventes" element={<VentesPage />} />
              <Route path="charges" element={<ChargesPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="rapports" element={<RapportsPage />} />
              <Route path="rapports/:rapportId" element={<RapportDetailPage />} />
              <Route path="distributions" element={<DistributionsPage />} />
              <Route path="acces" element={<AccesPage />} />
              <Route path="journal" element={<JournalPage />} />
              <Route path="*" element={<NotFoundBlock />} />
            </Route>
            <Route path="/403" element={<Forbidden />} />
            <Route path="*" element={<NotFoundBlock />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
