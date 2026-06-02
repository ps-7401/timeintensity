import { useState, useEffect, useRef } from 'react';
import { SamplingSettings } from '../types';
import { Play, Pause, RotateCcw, Activity, Gauge } from 'lucide-react';

interface TIRecorderProps {
  settings: SamplingSettings;
  curveValues: number[];
  onCurveChange: (newValues: number[]) => void;
}

export default function TIRecorder({
  settings,
  curveValues,
  onCurveChange,
}: TIRecorderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [activeIntensity, setActiveIntensity] = useState(0); // active slider value
  
  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const curveValuesRef = useRef<number[]>(curveValues);

  // Synchronize curve values ref
  useEffect(() => {
    curveValuesRef.current = curveValues;
  }, [curveValues]);

  // Synchronize slider state on start or reset
  useEffect(() => {
    if (!isPlaying) {
      // Find the value currently drawn at the elapsed time index to init slider
      const currentIdx = Math.min(999, Math.round((elapsedTime / settings.maxTime) * 999));
      setActiveIntensity(curveValues[currentIdx] || 0);
    }
  }, [elapsedTime, isPlaying, settings.maxTime]);

  const handleStart = () => {
    if (elapsedTime >= settings.maxTime) {
      // Auto reset if completed
      setElapsedTime(0);
      onCurveChange(Array<number>(1000).fill(0));
    }
    setIsPlaying(true);
    lastTickRef.current = performance.now();
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setElapsedTime(0);
    setActiveIntensity(0);
    onCurveChange(Array<number>(1000).fill(0));
  };

  // Recording loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const tick = () => {
      const now = performance.now();
      const delta = (now - lastTickRef.current) / 1000; // in seconds
      lastTickRef.current = now;

      setElapsedTime((prev) => {
        const nextTime = Math.min(settings.maxTime, prev + delta);
        
        // Record the intensity at this exact time point
        const currentIndex = Math.min(999, Math.round((nextTime / settings.maxTime) * 999));
        
        // Update the curve in parent state using modern synchronous ref
        const nextCurve = [...curveValuesRef.current];
        
        // Fill from previous elapsed indices up to current, to avoid gaps at high tick-rates
        const prevIndex = Math.min(999, Math.round((prev / settings.maxTime) * 999));
        for (let i = prevIndex; i <= currentIndex; i++) {
          nextCurve[i] = activeIntensity;
        }
        onCurveChange(nextCurve);

        if (nextTime >= settings.maxTime) {
          setIsPlaying(false);
          return settings.maxTime;
        }

        return nextTime;
      });

      timerRef.current = requestAnimationFrame(tick);
    };

    timerRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [isPlaying, activeIntensity, settings.maxTime, onCurveChange]);

  const progressPercentage = (elapsedTime / settings.maxTime) * 100;

  return (
    <div className="bg-white rounded-xl flex flex-col space-y-5">
      
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
          <h2 className="text-xs font-bold text-slate-450 uppercase tracking-widest font-mono">
            リアルタイム追跡評価 (Real-time Tracker)
          </h2>
        </div>
        <span className="text-[10px] sm:text-xs font-mono text-indigo-600 font-semibold bg-indigo-50/75 py-0.5 px-2 rounded-md">
          感覚パネル追跡 (Panel Track)
        </span>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
        タイマーを起動し、味覚の衰退や反応強度の時間変化に合わせて、フェーダーを上下にドラッグ、またはタッチ操作することで経時変化データを連続的に記録・構築します。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Controls and Timer Visual Area */}
        <div className="md:col-span-7 flex flex-col items-center justify-center p-6 bg-slate-50/50 border border-slate-150 rounded-xl space-y-5 flex-1">
          
          {/* Circular/Digital Timer */}
          <div className="text-center">
            <span className="text-5xl font-light font-mono text-slate-800 tracking-tight">
              {elapsedTime.toFixed(1)}
            </span>
            <span className="text-sm font-medium text-slate-400 font-mono">
              {' '}/ {settings.maxTime.toFixed(0)}s
            </span>
            <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-2.5 font-mono">
              現在の測定経過時間 (Elapsed Time)
            </p>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-75"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Core Controls */}
          <div className="flex items-center space-x-3 w-full justify-center">
            {!isPlaying ? (
              <button
                onClick={handleStart}
                className="flex items-center space-x-2 bg-slate-900 border border-slate-950 hover:bg-black text-white font-semibold py-2 px-5 rounded-lg text-xs shadow-xs cursor-pointer active:scale-98 transition-all"
                id="btn-rec-start"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>計測スタート (Start)</span>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center space-x-2 bg-amber-500 border border-amber-600 text-white font-semibold py-2 px-5 rounded-lg text-xs shadow-xs cursor-pointer active:scale-98 transition-all"
                id="btn-rec-pause"
              >
                <Pause className="w-3.5 h-3.5 fill-white" />
                <span>一時停止 (Pause)</span>
              </button>
            )}

            <button
              onClick={handleReset}
              className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2 px-4 rounded-lg text-xs shadow-2xs cursor-pointer active:scale-98 transition-all"
              id="btn-rec-reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>リセット</span>
            </button>
          </div>

          {/* Live Status Description */}
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 uppercase font-bold tracking-wider font-mono">
            <span className={`inline-block w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`}></span>
            <span>{isPlaying ? '評価データを記録中です...' : '待機中'}</span>
          </div>

        </div>

        {/* Dynamic Vertical / Touch Slider Fader Padding */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center w-full px-5 py-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-450 font-bold uppercase tracking-widest font-mono mb-4">
              <Gauge className="w-4 h-4 text-slate-400" />
              <span>フェーダー (Intensity Trackpad)</span>
            </div>

            {/* Giant vertical slider thumb container for mobile thumb evaluation */}
            <div className="relative h-48 w-16 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-end p-1 touch-none shadow-2xs overflow-hidden">
              {/* Scale marks inside slider */}
              <div className="absolute inset-y-2 inset-x-0 flex flex-col justify-between text-[8px] text-slate-400 font-bold font-mono pointer-events-none px-2 select-none">
                <span>MAX</span>
                <span>HIGH</span>
                <span>MID</span>
                <span>LOW</span>
                <span>0</span>
              </div>

              {/* Progress volume */}
              <div 
                className="bg-indigo-600 w-full rounded-lg transition-all duration-75 flex items-center justify-center opacity-90"
                style={{ height: `${(activeIntensity / settings.maxIntensity) * 100}%` }}
              >
                <span className="text-white text-[10px] font-bold font-mono select-none">
                  {activeIntensity.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Standard input range for precise drag */}
            <div className="w-full mt-4 flex items-center space-x-2">
              <span className="text-[10px] font-bold font-mono text-slate-400">0</span>
              <input
                type="range"
                min="0"
                max={settings.maxIntensity}
                step="1"
                value={activeIntensity}
                onChange={(e) => setActiveIntensity(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                id="slider-realtime-intensity"
              />
              <span className="text-[10px] font-bold font-mono text-slate-500">{settings.maxIntensity}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
