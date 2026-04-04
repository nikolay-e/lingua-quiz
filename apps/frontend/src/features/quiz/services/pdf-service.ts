import type { Translation } from '@api/types';

const FONT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf';

let cachedFontBase64: string | null = null;

async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch font: ${response.status}`);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

async function loadFont(): Promise<string> {
  if (cachedFontBase64 !== null) return cachedFontBase64;
  cachedFontBase64 = await fetchFontAsBase64(FONT_URL);
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
    loadFont(),
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
    if (t.sourceUsageExample !== null || t.targetUsageExample !== null) {
      const exampleParts = [t.sourceUsageExample, t.targetUsageExample].filter(
        (e): e is string => e !== null && e !== undefined,
      );
      if (exampleParts.length > 0) {
        rows.push([
          '',
          {
            content: exampleParts.join('\n'),
            styles: { fontSize: 7.5, textColor: [100, 100, 100] },
          },
          '',
        ]);
      }
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
