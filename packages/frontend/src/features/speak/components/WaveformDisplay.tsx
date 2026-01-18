import { useEffect, useRef } from 'react';

interface WaveformDisplayProps {
  audioData: Float32Array | null;
  isRecording: boolean;
}

export function WaveformDisplay({ audioData, isRecording }: WaveformDisplayProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = 'var(--color-surface, #1e293b)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (!audioData || audioData.length === 0) {
      ctx.strokeStyle = 'var(--color-border, #334155)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, rect.height / 2);
      ctx.lineTo(rect.width, rect.height / 2);
      ctx.stroke();
      return;
    }

    const step = Math.ceil(audioData.length / rect.width);
    const amp = rect.height / 2;

    ctx.strokeStyle = isRecording ? 'var(--color-error, #ef4444)' : 'var(--color-primary, #6366f1)';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < rect.width; i++) {
      const sliceStart = i * step;
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const datum = audioData[sliceStart + j];
        if (datum !== undefined) {
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }

      const y1 = (1 + min) * amp;
      const y2 = (1 + max) * amp;

      ctx.moveTo(i, y1);
      ctx.lineTo(i, y2);
    }

    ctx.stroke();
  }, [audioData, isRecording]);

  return <canvas ref={canvasRef} className="waveform-canvas" style={{ width: '100%', height: '96px' }} />;
}
