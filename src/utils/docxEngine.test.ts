import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Packer } from 'docx';
import { buildDocx, decodePng, fitSignature, SessionData } from './docxEngine';
import { buildPdfDefinition } from './pdfEngine';

const require = createRequire(import.meta.url);

// 1x1 PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const session: SessionData = {
  id: 'test',
  regNumber: 'PV-GDPR-2026/01',
  trainingDate: '2026-10-29',
  employees: [
    { id: '1', lastName: 'Petrea', firstName: 'Gabriel', status: 'signed', signatureBase64: PNG },
    { id: '2', lastName: 'Uscatu', firstName: 'Andrei', status: 'pending' },
  ],
  createdAt: new Date().toISOString(),
};

test('decodePng reads size and rejects garbage', () => {
  assert.deepEqual([decodePng(PNG)?.width, decodePng(PNG)?.height], [1, 1]);
  assert.equal(decodePng('data:image/png;base64,abc'), null);
  assert.equal(decodePng('not-a-data-url'), null);
});

test('fitSignature keeps aspect ratio inside the cell', () => {
  assert.deepEqual(fitSignature(400, 100), { width: 160, height: 40 });
  assert.deepEqual(fitSignature(100, 100), { width: 50, height: 50 });
});

test('buildDocx produces a docx file', async () => {
  const buf = await Packer.toBuffer(buildDocx(session));
  assert.equal(buf.toString('ascii', 0, 2), 'PK');
});

test('buildPdfDefinition renders to a PDF', async () => {
  const pdfmake = require('pdfmake');
  const fonts = require.resolve('pdfmake/fonts/Roboto/Roboto-Regular.ttf').replace(/Roboto-Regular\.ttf$/, '');
  pdfmake.addFonts({
    Roboto: {
      normal: fonts + 'Roboto-Regular.ttf',
      bold: fonts + 'Roboto-Medium.ttf',
      italics: fonts + 'Roboto-Italic.ttf',
      bolditalics: fonts + 'Roboto-MediumItalic.ttf',
    },
  });
  const buf: Buffer = await pdfmake.createPdf(buildPdfDefinition(session)).getBuffer();
  assert.equal(buf.toString('ascii', 0, 5), '%PDF-');
});
