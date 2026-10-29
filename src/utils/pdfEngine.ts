import { COMPANY, COMPANY_IDS, TITLE, SUBTITLE, SECTIONS, DECLARATION } from '../content';
import { SessionData, headerLine, fullName, signedPng, fitSignature } from './docxEngine';

/** pdfmake document definition with the same layout as the Word file. */
export function buildPdfDefinition(session: SessionData) {
  const cellMargin = [4, 5, 4, 5];

  const rows = session.employees.map((emp, i) => {
    const png = signedPng(emp);
    // docx sizes images in px, pdfmake in pt (1px = 0.75pt): same physical size in both files.
    const fit = png ? fitSignature(png.width, png.height) : null;
    const sig = fit ? { width: fit.width * 0.75, height: fit.height * 0.75 } : null;
    // pdfmake has no vertical centering, so pad the text cells down to the middle of the signature.
    const pad = sig ? Math.max(5, (sig.height + 6 - 12) / 2) : 5;
    const textMargin = [4, pad, 4, pad];
    return [
      { text: String(i + 1), alignment: 'center', margin: textMargin },
      { text: fullName(emp), margin: textMargin },
      sig ? { image: emp.signatureBase64!, ...sig, alignment: 'center', margin: [0, 3, 0, 3] } : { text: '' },
    ];
  });

  return {
    pageSize: 'A4',
    pageMargins: [57, 50, 57, 50],
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.1 },
    content: [
      { text: COMPANY, bold: true, fontSize: 12, alignment: 'center' },
      { text: COMPANY_IDS, fontSize: 9, alignment: 'center', margin: [0, 0, 0, 12] },
      { text: TITLE, bold: true, fontSize: 14, alignment: 'center' },
      { text: SUBTITLE, alignment: 'center', margin: [0, 0, 0, 12] },
      { text: headerLine(session), margin: [0, 0, 0, 10] },
      ...SECTIONS.flatMap((s) => [
        { text: s.title, bold: true, fontSize: 11, margin: [0, 4, 0, 2] },
        { text: s.text, alignment: 'justify', margin: [0, 0, 0, 4] },
      ]),
      { text: DECLARATION, alignment: 'justify', margin: [0, 8, 0, 10] },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ['10%', '55%', '35%'],
          body: [
            [
              { text: 'Nr.', bold: true, alignment: 'center', fillColor: '#F2F2F2', margin: cellMargin },
              { text: 'Nume și prenume', bold: true, fillColor: '#F2F2F2', margin: cellMargin },
              { text: 'Semnătura', bold: true, alignment: 'center', fillColor: '#F2F2F2', margin: cellMargin },
            ],
            ...rows,
          ],
        },
      },
    ],
  };
}
