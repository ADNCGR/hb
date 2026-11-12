import { api } from '@/api/client';

export async function telecharger(documentId: string) {
  const { blob, nom } = await api.documents.fichier(documentId);
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nom });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
