import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Packer } from 'docx';
import { EmployeeRecord, SessionData, buildDocx } from './utils/docxEngine';
import { buildPdfDefinition } from './utils/pdfEngine';
import { InlineSignatureRow } from './components/InlineSignatureRow';
import { COMPANY, COMPANY_IDS, TITLE, SUBTITLE, SECTIONS, DECLARATION } from './content';

const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  { id: 'emp-1', lastName: 'Petrea', firstName: 'Gabriel', status: 'pending' },
  { id: 'emp-2', lastName: 'Uscatu', firstName: 'Andrei', status: 'pending' },
  { id: 'emp-3', lastName: 'Nicolae', firstName: 'George', status: 'pending' },
  { id: 'emp-4', lastName: 'Bursuc', firstName: 'Flavian', status: 'pending' },
];

interface GenerationResult {
  docxUrl: string;
  docxFilename: string;
  pdfUrl: string;
  pdfFilename: string;
}

const inputClass = 'px-2 py-1 border border-neutral-300 rounded-md text-sm bg-white';

export default function App() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(INITIAL_EMPLOYEES);
  const [regNumber, setRegNumber] = useState('PV-GDPR-2026/01');
  const [trainingDate, setTrainingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newEmployeeName, setNewEmployeeName] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Any change to the list makes previously generated files outdated.
  const updateEmployees = (fn: (prev: EmployeeRecord[]) => EmployeeRecord[]) => {
    setEmployees(fn);
    setResult(null);
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const [lastName, ...rest] = newEmployeeName.trim().split(/\s+/);
    if (!lastName) return;
    updateEmployees((prev) => [
      ...prev,
      { id: `emp-${Date.now()}`, lastName, firstName: rest.join(' '), status: 'pending' },
    ]);
    setNewEmployeeName('');
  };

  const handleSaveSignature = (id: string, signatureBase64: string) =>
    updateEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, signatureBase64, status: 'signed', timestamp: new Date().toISOString() } : emp
      )
    );

  const handleClearSignature = (id: string) =>
    updateEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, signatureBase64: undefined, status: 'pending', timestamp: undefined } : emp
      )
    );

  const handleDeleteEmployee = (id: string) => updateEmployees((prev) => prev.filter((emp) => emp.id !== id));

  // Both files are built in the browser, so signatures never leave the device.
  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    const session: SessionData = {
      id: `sess-${Date.now()}`,
      regNumber,
      trainingDate,
      employees,
      createdAt: new Date().toISOString(),
    };

    try {
      const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts'),
      ]);
      (pdfMake as any).addVirtualFileSystem(vfs);

      const [docxBlob, pdfBlob] = await Promise.all([
        Packer.toBlob(buildDocx(session)),
        (pdfMake as any).createPdf(buildPdfDefinition(session)).getBlob() as Promise<Blob>,
      ]);

      const baseName = `Proces-Verbal-GDPR-${trainingDate}`;
      setResult({
        docxUrl: URL.createObjectURL(docxBlob),
        docxFilename: `${baseName}.docx`,
        pdfUrl: URL.createObjectURL(pdfBlob),
        pdfFilename: `${baseName}.pdf`,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Generarea a eșuat.');
    } finally {
      setIsGenerating(false);
    }
  };

  const signedCount = employees.filter((e) => e.signatureBase64).length;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <main className="max-w-3xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
        <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <div className="text-center">
            <div className="font-semibold">{COMPANY}</div>
            <div className="text-xs text-neutral-500">{COMPANY_IDS}</div>
            <h1 className="mt-4 text-lg font-semibold">{TITLE}</h1>
            <div className="text-sm text-neutral-600">{SUBTITLE}</div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              Nr.
              <input className={inputClass} value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
            </label>
            <label className="flex items-center gap-2">
              Data
              <input
                type="date"
                className={inputClass}
                value={trainingDate}
                onChange={(e) => setTrainingDate(e.target.value)}
              />
            </label>
          </div>

          <div className="space-y-3 text-sm text-neutral-700 leading-relaxed">
            {SECTIONS.map((s) => (
              <div key={s.title}>
                <div className="font-medium text-neutral-900">{s.title}</div>
                <p>{s.text}</p>
              </div>
            ))}
            <p className="pt-2">{DECLARATION}</p>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Semnături</h2>
            <span className="text-sm text-neutral-500">
              {signedCount} din {employees.length}
            </span>
          </div>

          {employees.map((emp, index) => (
            <InlineSignatureRow
              key={emp.id}
              index={index}
              id={emp.id}
              lastName={emp.lastName}
              firstName={emp.firstName}
              signatureBase64={emp.signatureBase64}
              onSaveSignature={handleSaveSignature}
              onClearSignature={handleClearSignature}
              onDelete={employees.length > 1 ? handleDeleteEmployee : undefined}
            />
          ))}

          <form onSubmit={handleAddEmployee} className="flex gap-2">
            <input
              className={`${inputClass} flex-1`}
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              placeholder="Nume Prenume"
            />
            <Button type="submit" variant="outline" size="sm">
              Adaugă angajat
            </Button>
          </form>
        </section>

        <section className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
          {errorMessage && <p className="text-sm text-red-700">{errorMessage}</p>}

          <Button type="button" onClick={handleGenerate} disabled={isGenerating || employees.length === 0}>
            {isGenerating ? 'Se generează...' : 'Generează documentul'}
          </Button>

          {result && (
            <div className="flex flex-wrap gap-4 text-sm">
              <a className="underline" href={result.docxUrl} download={result.docxFilename}>
                Descarcă Word
              </a>
              <a className="underline" href={result.pdfUrl} download={result.pdfFilename}>
                Descarcă PDF
              </a>
              <a className="underline" href={result.pdfUrl} target="_blank" rel="noreferrer">
                Deschide PDF
              </a>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
