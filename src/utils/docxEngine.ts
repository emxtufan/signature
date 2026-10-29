import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  VerticalAlign,
} from 'docx';
import { COMPANY, COMPANY_IDS, TITLE, SUBTITLE, SECTIONS, DECLARATION } from '../content';

export interface EmployeeRecord {
  id: string;
  firstName: string;
  lastName: string;
  signatureBase64?: string;
  timestamp?: string;
  status: 'pending' | 'signed' | 'cancelled';
}

export interface SessionData {
  id: string;
  regNumber: string;
  trainingDate: string;
  department?: string;
  employees: EmployeeRecord[];
  createdAt: string;
}

const FONT = 'Calibri';
export const SIG_MAX_W = 160;
export const SIG_MAX_H = 50;

export const headerLine = (s: SessionData) =>
  `Nr. ${s.regNumber}   Data: ${s.trainingDate}${s.department ? `   Departament: ${s.department}` : ''}`;

export const fullName = (e: EmployeeRecord) => `${e.lastName.toUpperCase()} ${e.firstName}`.trim();

/** PNG bytes and pixel size from a data URL, or null if it is not a valid PNG. */
export function decodePng(dataUrl: string): { bytes: Uint8Array; width: number; height: number } | null {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match) return null;
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
  const isPng = bytes.length > 24 && String.fromCharCode(bytes[1], bytes[2], bytes[3]) === 'PNG';
  if (!isPng) return null;
  // Width/height live in the IHDR chunk.
  const view = new DataView(bytes.buffer);
  return { bytes, width: view.getUint32(16), height: view.getUint32(20) };
}

/** Signature size that fits the table cell while keeping the drawn aspect ratio. */
export function fitSignature(width: number, height: number) {
  const scale = Math.min(SIG_MAX_W / width, SIG_MAX_H / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export const signedPng = (e: EmployeeRecord) =>
  e.status === 'signed' && e.signatureBase64 ? decodePng(e.signatureBase64) : null;

const text = (t: string, opts: { bold?: boolean; size?: number } = {}) =>
  new TextRun({ text: t, font: FONT, size: opts.size ?? 21, bold: opts.bold });

const cell = (width: number, children: Paragraph[], shaded = false) =>
  new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: shaded ? { fill: 'F2F2F2' } : undefined,
    children,
  });

const cellText = (t: string, align: (typeof AlignmentType)[keyof typeof AlignmentType], bold = false) =>
  new Paragraph({ alignment: align, spacing: { before: 60, after: 60 }, children: [text(t, { bold })] });

function signatureParagraph(emp: EmployeeRecord): Paragraph {
  const png = signedPng(emp);
  if (!png) return new Paragraph({ children: [] });
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 40 },
    children: [new ImageRun({ type: 'png', data: png.bytes, transformation: fitSignature(png.width, png.height) })],
  });
}

/** Word document for the session; turn it into a file with Packer.toBlob / Packer.toBuffer. */
export function buildDocx(session: SessionData): Document {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        cell(10, [cellText('Nr.', AlignmentType.CENTER, true)], true),
        cell(55, [cellText('Nume și prenume', AlignmentType.LEFT, true)], true),
        cell(35, [cellText('Semnătura', AlignmentType.CENTER, true)], true),
      ],
    }),
    ...session.employees.map(
      (emp, i) =>
        new TableRow({
          cantSplit: true,
          children: [
            cell(10, [cellText(String(i + 1), AlignmentType.CENTER)]),
            cell(55, [cellText(fullName(emp), AlignmentType.LEFT)]),
            cell(35, [signatureParagraph(emp)]),
          ],
        })
    ),
  ];

  return new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [text(COMPANY, { bold: true, size: 24 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [text(COMPANY_IDS, { size: 18 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [text(TITLE, { bold: true, size: 28 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [text(SUBTITLE)] }),
          new Paragraph({ spacing: { after: 200 }, children: [text(headerLine(session))] }),
          ...SECTIONS.flatMap((s) => [
            new Paragraph({ spacing: { before: 80, after: 40 }, children: [text(s.title, { bold: true, size: 22 })] }),
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 80 }, children: [text(s.text)] }),
          ]),
          new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: 160, after: 200 }, children: [text(DECLARATION)] }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
        ],
      },
    ],
  });
}
