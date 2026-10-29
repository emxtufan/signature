import React, { useEffect, useState } from 'react';
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

// The session is saved on the server (api/state.ts, Vercel Blob) and mirrored in localStorage.
// `npm run dev` has no api/, so locally only localStorage is used.
const USE_SERVER = !import.meta.env.DEV;
const STORAGE_KEY = 'pv-gdpr';
const today = () => new Date().toISOString().slice(0, 10);

interface SavedState {
  employees?: EmployeeRecord[];
  regNumber?: string;
  trainingDate?: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

function loadLocal(): SavedState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

const postState = (method: 'PUT' | 'POST', state: SavedState) =>
  fetch('/api/state', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
    keepalive: true,
  }).then((res) => res.ok);

export default function App() {
  const [local] = useState(loadLocal);
  const [employees, setEmployees] = useState<EmployeeRecord[]>(local.employees ?? INITIAL_EMPLOYEES);
  const [regNumber, setRegNumber] = useState(local.regNumber ?? 'PV-GDPR-2026/01');
  const [trainingDate, setTrainingDate] = useState(local.trainingDate ?? today());
  const [newEmployeeName, setNewEmployeeName] = useState('');
  // Bumped on "Sesiune nouă" so the signature canvases remount empty.
  const [sessionKey, setSessionKey] = useState(0);
  const [loaded, setLoaded] = useState(!USE_SERVER);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    if (!USE_SERVER) return;
    fetch('/api/state', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((state: SavedState) => {
        if (Array.isArray(state.employees)) {
          setEmployees(state.employees);
          setRegNumber(state.regNumber ?? '');
          setTrainingDate(state.trainingDate ?? today());
        }
      })
      // Never push local data over the server copy we could not read.
      .catch(() => setSaveStatus('offline'))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const state = { employees, regNumber, trainingDate };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      if (!USE_SERVER) setSaveStatus('error');
    }
    if (!USE_SERVER || saveStatus === 'offline') return;

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      postState('PUT', state)
        .catch(() => false)
        .then((ok) => setSaveStatus(ok ? 'saved' : 'error'));
    }, 800);
    return () => clearTimeout(timer);
  }, [employees, regNumber, trainingDate, loaded]);

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

  const handleNewSession = async () => {
    if (!window.confirm('Ștergeți toate semnăturile și începeți o sesiune nouă?')) return;
    // Keep a copy of the finished session before clearing it.
    if (USE_SERVER) {
      const ok = await postState('POST', { employees, regNumber, trainingDate }).catch(() => false);
      if (!ok) {
        setErrorMessage('Sesiunea curentă nu a putut fi arhivată pe server. Semnăturile nu au fost șterse.');
        return;
      }
    }
    updateEmployees((prev) =>
      prev.map((emp) => ({ ...emp, signatureBase64: undefined, status: 'pending', timestamp: undefined }))
    );
    setTrainingDate(today());
    setSessionKey((k) => k + 1);
  };

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
            <div className="flex items-baseline gap-4 text-sm">
              {saveStatus === 'saving' && <span className="text-neutral-500">Se salvează…</span>}
              {saveStatus === 'saved' && <span className="text-green-700">Salvat</span>}
              <span className="text-neutral-500">
                {signedCount} din {employees.length}
              </span>
              <button type="button" className="underline text-neutral-600" onClick={handleNewSession}>
                Sesiune nouă
              </button>
            </div>
          </div>

          {saveStatus === 'error' && (
            <p className="text-sm text-red-700">
              Semnăturile nu au putut fi salvate. Generați documentul înainte de a închide pagina.
            </p>
          )}
          {saveStatus === 'offline' && (
            <p className="text-sm text-red-700">
              Datele nu au putut fi încărcate de pe server, deci nu se salvează acolo. Reîncărcați pagina.
            </p>
          )}

          {!loaded && <p className="text-sm text-neutral-500">Se încarcă…</p>}

          {loaded && employees.map((emp, index) => (
            <InlineSignatureRow
              key={`${emp.id}-${sessionKey}`}
              index={index}
              id={emp.id}
              lastName={emp.lastName}
              firstName={emp.firstName}
              signatureBase64={emp.signatureBase64}
              timestamp={emp.timestamp}
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
