import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { isApiError } from '@/api/errors';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (n, e) => !(isApiError(e) && [401, 403, 404, 409, 422, 423].includes(e.status)) && n < 2,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
