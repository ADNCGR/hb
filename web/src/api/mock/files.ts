const ascii = (s: string) => s.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '');

export function pdfPlaceholder(nom: string): Blob {
  const lines = ['FRACT. - document de demonstration', '', ascii(nom), '', 'Fichier fictif genere par le serveur local de demonstration.'];
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 56 ${780 - i * 22} Td (${l}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: 'application/pdf' });
}

export function imagePlaceholder(nom: string, mime: string): Blob {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 500;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#efeff1';
  g.fillRect(0, 0, 800, 500);
  g.fillStyle = '#0a0a0a';
  g.font = '600 28px Poppins, Arial, sans-serif';
  g.fillText('FRACT - image de démonstration', 48, 230);
  g.fillStyle = '#5c5c5c';
  g.font = '18px Inter, Arial, sans-serif';
  g.fillText(nom, 48, 270);
  const data = atob(canvas.toDataURL(mime).split(',')[1]);
  const bytes = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
