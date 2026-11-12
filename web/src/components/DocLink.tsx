import { useState } from 'react';
import { isApiError } from '@/api/errors';
import { telecharger } from '@/lib/download';
import { cn } from '@/lib/cn';
import { useToast } from './toast';
import { Spinner } from './ui/button';
import { Icon } from './ui/Icon';

export function DocLink({ id, nom, className }: { id: string; nom: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try { await telecharger(id); } catch (e) { toast(isApiError(e) ? e.message : 'Téléchargement impossible.', 'bad'); } finally { setBusy(false); }
      }}
      className={cn('inline-flex max-w-full items-center gap-1.5 text-left text-[13.5px] underline decoration-black/30 underline-offset-[3px] hover:decoration-black', className)}
      title={`Télécharger ${nom}`}
    >
      {busy ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="download" className="h-3.5 w-3.5" />}
      <span className="truncate">{nom}</span>
    </button>
  );
}
