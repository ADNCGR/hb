import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './ui/Icon';

type Tone = 'ok' | 'bad' | 'neutral';
interface Toast { id: number; message: string; tone: Tone }
const Ctx = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Tone = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(420px,calc(100vw-32px))] flex-col gap-2" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div key={t.id} className={cn('pointer-events-auto flex items-start gap-2.5 rounded-row px-4 py-3 text-[14px] leading-snug text-white shadow-[0_10px_30px_-18px_rgba(0,0,0,0.5)]', t.tone === 'bad' ? 'bg-bad' : 'bg-ink')}>
            <Icon name={t.tone === 'bad' ? 'alert' : 'check'} className="mt-px h-[18px] w-[18px]" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
