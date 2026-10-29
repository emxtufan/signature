import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { computeBoundingBox } from '../utils/signatureUtils';

interface InlineSignatureRowProps {
  index: number;
  id: string;
  lastName: string;
  firstName: string;
  signatureBase64?: string;
  onSaveSignature: (id: string, base64: string) => void;
  onClearSignature: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const InlineSignatureRow: React.FC<InlineSignatureRowProps> = ({
  index,
  id,
  lastName,
  firstName,
  signatureBase64,
  onSaveSignature,
  onClearSignature,
  onDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(Boolean(signatureBase64));

  // Size the canvas once, at device pixel ratio, and redraw an existing signature.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2.4;

    if (signatureBase64) {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min((rect.width - 20) / img.width, (rect.height - 20) / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (rect.width - w) / 2, (rect.height - h) / 2, w, h);
      };
      img.src = signatureBase64;
    }
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const p = getPoint(e);
    lastPointRef.current = p;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const last = lastPointRef.current;
    const ctx = canvasRef.current?.getContext('2d');
    if (!last || !ctx) return;

    e.preventDefault();
    const p = getPoint(e);
    ctx.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2);
    ctx.stroke();
    lastPointRef.current = p;
  };

  // Save a cropped PNG of the signature after every stroke.
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!lastPointRef.current || !canvas) return;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    lastPointRef.current = null;

    const ctx = canvas.getContext('2d')!;
    const box = computeBoundingBox(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, 8);
    if (!box) return;

    const cropped = document.createElement('canvas');
    cropped.width = box.width;
    cropped.height = box.height;
    cropped.getContext('2d')!.drawImage(canvas, box.minX, box.minY, box.width, box.height, 0, 0, box.width, box.height);
    onSaveSignature(id, cropped.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    onClearSignature(id);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 bg-white border border-neutral-200 rounded-lg">
      <div className="md:w-5/12">
        <div className="font-medium text-neutral-900">
          {index + 1}. {lastName} {firstName}
        </div>
        <div className={`text-xs ${signatureBase64 ? 'text-green-700' : 'text-neutral-500'}`}>
          {signatureBase64 ? 'Semnat' : 'Nesemnat'}
        </div>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 h-32 border border-neutral-300 rounded-md overflow-hidden select-none">
          <canvas
            ref={canvasRef}
            aria-label={`Semnătura pentru ${lastName} ${firstName}`}
            className="w-full h-full block cursor-crosshair"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          {!hasDrawn && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-neutral-400">
              Semnați aici
            </div>
          )}
        </div>

        <div className="flex sm:flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClear}>
            Șterge semnătura
          </Button>
          {onDelete && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(id)}>
              Elimină
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
