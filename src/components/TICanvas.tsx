import { useEffect, useRef, useState, MouseEvent, TouchEvent } from 'react';
import { SamplingSettings, CurvePoint } from '../types';
import { RotateCcw, Undo2, Redo2, Paintbrush } from 'lucide-react';

interface TICanvasProps {
  settings: SamplingSettings;
  curveValues: number[]; // 1000 indices from 0 to 999 representing times from 0 to maxTime
  onCurveChange: (newValues: number[]) => void;
  sampledPoints: CurvePoint[];
}

export default function TICanvas({
  settings,
  curveValues,
  onCurveChange,
  sampledPoints,
}: TICanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  
  // Undo/Redo history
  const [history, setHistory] = useState<number[][]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastIndex, setLastIndex] = useState<number | null>(null);

  // Maintain undo/redo states safely
  const pushToHistory = (newValues: number[]) => {
    // Cut any redo states that were ahead of the pointer
    const cleanedHistory = history.slice(0, historyPointer + 1);
    const updatedHistory = [...cleanedHistory, [...newValues]];
    
    // Limit history stack size to 50
    if (updatedHistory.length > 50) {
      updatedHistory.shift();
    }
    
    setHistory(updatedHistory);
    setHistoryPointer(updatedHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyPointer > 0) {
      const nextPointer = historyPointer - 1;
      setHistoryPointer(nextPointer);
      onCurveChange([...history[nextPointer]]);
    }
  };

  const handleRedo = () => {
    if (historyPointer < history.length - 1) {
      const nextPointer = historyPointer + 1;
      setHistoryPointer(nextPointer);
      onCurveChange([...history[nextPointer]]);
    }
  };

  const handleClear = () => {
    const cleared = Array<number>(1000).fill(0);
    pushToHistory(cleared);
    onCurveChange(cleared);
  };

  const handleResetToLinear = () => {
    // Create a smooth linear transition from 0 to peak to 0 or simple ramp
    const ramp = Array<number>(1000).fill(0).map((_, i) => {
      // Curve ramping up to max intensity at 1/3 time, then down
      if (i < 333) {
        return (i / 333) * settings.maxIntensity * 0.8;
      } else {
        return Math.max(0, (1 - (i - 333) / 667) * settings.maxIntensity * 0.8);
      }
    });
    pushToHistory(ramp);
    onCurveChange(ramp);
  };

  // Safe container measurement via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Keep a neat aspect ratio (default approx 3:2, constrained on small screens)
        const activeWidth = width;
        const activeHeight = Math.max(280, Math.min(480, width * 0.6));
        setDimensions({ width: activeWidth, height: activeHeight });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Set initial history item if history is empty
  useEffect(() => {
    if (history.length === 0) {
      setHistory([[...curveValues]]);
      setHistoryPointer(0);
    }
  }, []);

  // Update drawing helper
  const drawOnCoordinate = (clientX: number, clientY: number, isStarting: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Convert pixel to data-index (0 to 999)
    // Map pixels in the drawable inner region (excluding padding)
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const graphWidth = dimensions.width - paddingLeft - paddingRight;
    const graphHeight = dimensions.height - paddingTop - paddingBottom;

    // Clamped X coordinate inside the actual plot boundaries
    const plotX = Math.max(0, Math.min(graphWidth, x - paddingLeft));
    const rawIndex = (plotX / graphWidth) * 999;
    const currentIndex = Math.round(rawIndex);

    // Convert Y to intensity coordinate inside bounds
    const plotY = Math.max(0, Math.min(graphHeight, y - paddingTop));
    const rawIntensity = (1 - plotY / graphHeight) * settings.maxIntensity;
    const currentIntensity = Math.max(0, Math.min(settings.maxIntensity, rawIntensity));

    const updatedValues = [...curveValues];

    if (isStarting || lastIndex === null) {
      updatedValues[currentIndex] = currentIntensity;
    } else {
      // Connect gaps with linear interpolation
      const startIdx = Math.min(lastIndex, currentIndex);
      const endIdx = Math.max(lastIndex, currentIndex);
      
      const startIntensity = updatedValues[lastIndex];
      const endIntensity = currentIntensity;

      for (let j = startIdx; j <= endIdx; j++) {
        if (endIdx === startIdx) {
          updatedValues[j] = currentIntensity;
        } else {
          const ratio = (j - lastIndex) / (currentIndex - lastIndex);
          updatedValues[j] = Math.max(0, Math.min(settings.maxIntensity, startIntensity + ratio * (endIntensity - startIntensity)));
        }
      }
    }

    setLastIndex(currentIndex);
    onCurveChange(updatedValues);
  };

  // Pointer/Mouse handlers
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Left click only
    setIsDrawing(true);
    drawOnCoordinate(e.clientX, e.clientY, true);
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    drawOnCoordinate(e.clientX, e.clientY, false);
  };

  const handleMouseUpOrLeave = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setLastIndex(null);
      pushToHistory(curveValues);
    }
  };

  // Touch handlers
  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    setIsDrawing(true);
    drawOnCoordinate(touch.clientX, touch.clientY, true);
  };

  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const touch = e.touches[0];
    drawOnCoordinate(touch.clientX, touch.clientY, false);
  };

  const handleTouchEnd = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setLastIndex(null);
      pushToHistory(curveValues);
    }
  };

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Padding configurations
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const graphWidth = dimensions.width - paddingLeft - paddingRight;
    const graphHeight = dimensions.height - paddingTop - paddingBottom;

    // Clear Canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Draw background Grid Lines
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 1;

    // Grid columns (Time) – every 5 intervals or suitable distribution
    const numTicksX = settings.maxTime <= 30 ? 6 : 10;
    for (let c = 0; c <= numTicksX; c++) {
      const fraction = c / numTicksX;
      const xPos = paddingLeft + fraction * graphWidth;

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(xPos, paddingTop);
      ctx.lineTo(xPos, paddingTop + graphHeight);
      ctx.stroke();

      // Labels below X-axis
      ctx.setLineDash([]);
      ctx.fillStyle = '#64748b'; // slate-500
      ctx.font = '11px var(--font-sans)';
      ctx.textAlign = 'center';
      const timeVal = (fraction * settings.maxTime).toFixed(1);
      ctx.fillText(`${timeVal}s`, xPos, paddingTop + graphHeight + 18);
    }

    // Grid rows (Intensity) – 5 rows
    const numTicksY = 5;
    for (let r = 0; r <= numTicksY; r++) {
      const fraction = r / numTicksY;
      const yPos = paddingTop + fraction * graphHeight;

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(paddingLeft, yPos);
      ctx.lineTo(paddingLeft + graphWidth, yPos);
      ctx.stroke();

      // Labels left of Y-axis
      ctx.setLineDash([]);
      ctx.fillStyle = '#64748b'; // slate-500
      ctx.font = '11px var(--font-sans)';
      ctx.textAlign = 'right';
      const intensVal = ((1 - fraction) * settings.maxIntensity).toFixed(0);
      ctx.fillText(intensVal, paddingLeft - 8, yPos + 4);
    }

    // Area Fill Under Curve (Using gorgeous gradient)
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop + graphHeight);
    
    // Plot vertices
    for (let i = 0; i < 1000; i++) {
      const val = curveValues[i] || 0;
      const xPct = i / 999;
      const yPct = 1 - (val / settings.maxIntensity);

      const xPos = paddingLeft + xPct * graphWidth;
      const yPos = paddingTop + yPct * graphHeight;

      ctx.lineTo(xPos, yPos);
    }
    ctx.lineTo(paddingLeft + graphWidth, paddingTop + graphHeight);
    ctx.closePath();

    const areaGradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + graphHeight);
    areaGradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)'); // emerald-500 tint
    areaGradient.addColorStop(1, 'rgba(16, 185, 129, 0.00)');
    ctx.fillStyle = areaGradient;
    ctx.fill();

    // Draw main Curve Outline
    ctx.beginPath();
    for (let i = 0; i < 1000; i++) {
      const val = curveValues[i] || 0;
      const xPct = i / 999;
      const yPct = 1 - (val / settings.maxIntensity);

      const xPos = paddingLeft + xPct * graphWidth;
      const yPos = paddingTop + yPct * graphHeight;

      if (i === 0) {
        ctx.moveTo(xPos, yPos);
      } else {
        ctx.lineTo(xPos, yPos);
      }
    }
    ctx.strokeStyle = '#059669'; // emerald-600
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Draw Sampling Dots
    sampledPoints.forEach((point) => {
      const xPct = point.t / settings.maxTime;
      const yPct = 1 - (point.intensity / settings.maxIntensity);

      const xPos = paddingLeft + xPct * graphWidth;
      const yPos = paddingTop + yPct * graphHeight;

      // Draw dot
      ctx.beginPath();
      ctx.arc(xPos, yPos, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#047857'; // emerald-700
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw Core Axes Solid Lines
    ctx.strokeStyle = '#475569'; // slate-600
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, paddingTop + graphHeight);
    ctx.lineTo(paddingLeft + graphWidth, paddingTop + graphHeight);
    ctx.stroke();

    // Draw label descriptions
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.font = '500 12px var(--font-sans)';
    ctx.textAlign = 'center';

    // X axis label
    ctx.fillText('時間 Time (s)', paddingLeft + graphWidth / 2, paddingTop + graphHeight + 35);

    // Y axis label (rotated)
    ctx.save();
    ctx.translate(15, paddingTop + graphHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`強度 Intensity (${settings.attributeName})`, 0, 0);
    ctx.restore();

  }, [dimensions, curveValues, settings, sampledPoints]);

  return (
    <div className="flex flex-col space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
          <h2 className="text-xs font-bold text-slate-450 uppercase tracking-widest font-mono">描画キャンバス (Drawing Canvas)</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[10px] sm:text-xs">
          <div className="flex items-center space-x-1.5 font-mono text-slate-500">
            <span className="inline-block w-2.5 h-2.5 bg-emerald-500 border border-emerald-600 rounded-xs"></span>
            <span>連続曲線 (Outline)</span>
          </div>
          <div className="flex items-center space-x-1.5 font-mono text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-white border border-emerald-700"></span>
            <span>CSVサンプリング (Data-points)</span>
          </div>
        </div>
      </div>

      {/* Drawing board container */}
      <div className="relative border border-slate-200 rounded-xl bg-white shadow-xs p-5 overflow-hidden group">
        {/* Draw Instructions */}
        <div className="absolute top-4 right-4 bg-slate-900 text-white text-[10px] tracking-wide py-1 px-2.5 rounded font-medium pointer-events-none select-none z-10 opacity-70 group-hover:opacity-100 transition-opacity">
          DRAW: DRAG MOUSE OR SWIPE SCREEN
        </div>

        {/* Blueprint background grid dots behind canvas */}
        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }}></div>

        <div 
          ref={containerRef} 
          className="canvas-container w-full overflow-hidden relative z-1"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <canvas
            ref={canvasRef}
            className="block cursor-crosshair mx-auto transition-colors focus:outline-hidden rounded-lg bg-white/95"
            style={{ 
              width: dimensions.width, 
              height: dimensions.height,
              touchAction: 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      </div>

      {/* Editing Toolbar */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          onClick={handleUndo}
          disabled={historyPointer <= 0}
          className="flex items-center space-x-1.5 text-xs py-1.5 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 active:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all shadow-2xs font-medium"
          title="元に戻す (Undo)"
          id="btn-undo"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          onClick={handleRedo}
          disabled={historyPointer >= history.length - 1}
          className="flex items-center space-x-1.5 text-xs py-1.5 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 active:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all shadow-2xs font-medium"
          title="やり直し (Redo)"
          id="btn-redo"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span>Redo</span>
        </button>

        <button
          onClick={handleResetToLinear}
          className="flex items-center space-x-1.5 text-xs py-1.5 px-3 rounded-lg bg-indigo-50 border border-indigo-100/60 text-indigo-700 hover:bg-indigo-100 hover:indigo-800 font-medium cursor-pointer transition-all shadow-2xs"
          title="初期山型プリセットをロード"
          id="btn-preset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>プリセット山型</span>
        </button>

        <button
          onClick={handleClear}
          className="flex items-center space-x-1.5 text-xs py-1.5 px-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 hover:text-rose-700 font-medium cursor-pointer transition-all shadow-2xs"
          title="キャンバスをクリア"
          id="btn-clear"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>クリア</span>
        </button>
      </div>
    </div>
  );
}
