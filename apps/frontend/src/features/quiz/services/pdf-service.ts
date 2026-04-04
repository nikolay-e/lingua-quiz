import type { Translation } from '@api/types';

const FONT_PATH = '/fonts/Roboto-Regular.ttf';

let cachedFontBase64: string | null = null;

async function fetchFontAsBase64(): Promise<string> {
  if (cachedFontBase64 !== null) return cachedFontBase64;

  const response = await fetch(FONT_PATH);
  if (!response.ok) throw new Error(`Failed to load font: ${response.status}`);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  cachedFontBase64 = btoa(binary);
  return cachedFontBase64;
}

export async function generateVocabularyPdf(
  translations: Translation[],
  listName: string,
  includeExamples: boolean,
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }, fontBase64] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    fetchFontAsBase64(),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.setFont('Roboto', 'normal');

  // Title
  doc.setFontSize(18);
  doc.text(listName, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${String(translations.length)} words`, 14, 27);
  doc.setTextColor(0);

  const fontName = 'Roboto';

  if (includeExamples) {
    generateWithExamples(doc, autoTable, translations, fontName);
  } else {
    generateCompact(doc, autoTable, translations, fontName);
  }

  doc.save(`${listName.replace(/\s+/g, '-')}.pdf`);
}

type AutoTableFn = typeof import('jspdf-autotable').default;
type JsPDFInstance = InstanceType<typeof import('jspdf').default>;

function generateCompact(
  doc: JsPDFInstance,
  autoTable: AutoTableFn,
  translations: Translation[],
  fontName: string,
): void {
  const rows: string[][] = translations.map((t, i) => [String(i + 1), t.sourceText, t.targetText]);

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Word', 'Translation']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2, font: fontName },
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'right' },
      1: { cellWidth: 65 },
    },
    margin: { left: 14, right: 14 },
  });
}

function generateWithExamples(
  doc: JsPDFInstance,
  autoTable: AutoTableFn,
  translations: Translation[],
  fontName: string,
): void {
  const rows: (string | { content: string; styles: Record<string, unknown> })[][] = [];

  for (let i = 0; i < translations.length; i++) {
    const t = translations[i];
    if (t === undefined) continue;
    rows.push([String(i + 1), t.sourceText, t.targetText]);
    const srcEx = t.sourceUsageExample ?? '';
    const tgtEx = t.targetUsageExample ?? '';
    if (srcEx !== '' || tgtEx !== '') {
      const exStyle = { fontSize: 7.5, textColor: [100, 100, 100] };
      rows.push([
        '',
        { content: srcEx, styles: exStyle },
        { content: tgtEx, styles: exStyle },
      ]);
    }
  }

  autoTable(doc, {
    startY: 32,
    head: [['#', 'Word / Example', 'Translation']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2, font: fontName },
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'right' },
      1: { cellWidth: 85 },
    },
    margin: { left: 14, right: 14 },
  });
}
