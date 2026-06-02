import { useState, useMemo } from 'react';
import { SamplingSettings, CurvePoint, AppMode } from './types';
import TICanvas from './components/TICanvas';
import TIDataPreview from './components/TIDataPreview';
import TIRecorder from './components/TIRecorder';
import TIHelpModal from './components/TIHelpModal';
import { Activity, Paintbrush, BookOpen, Clock, DownloadCloud } from 'lucide-react';

export default function App() {
  // App-wide configuration state
  const [settings, setSettings] = useState<SamplingSettings>({
    maxTime: 60,
    maxIntensity: 100,
    interval: 1.0,
    attributeName: 'Sweetness',
  });

  // Current Mode: 'freehand' | 'realtime'
  const [mode, setMode] = useState<AppMode>('freehand');

  // Curve data representing the intensity profile over time (1000 points from t=0 to t=maxTime)
  const [curveValues, setCurveValues] = useState<number[]>(() => Array<number>(1000).fill(0));

  // Interpolated sampling points based on the active interval setting
  const sampledPoints = useMemo<CurvePoint[]>(() => {
    const points: CurvePoint[] = [];
    const intervalSec = settings.interval;
    const maxTime = settings.maxTime;

    // Generate coordinate times based on standard steps
    for (let t = 0; t <= maxTime + 0.0001; t += intervalSec) {
      // Avoid tiny floats exceeding limits
      const roundedTime = Math.min(maxTime, Math.round(t * 1000) / 1000);
      
      // Calculate fraction and corresponding curve array index (0 to 999)
      const fraction = roundedTime / maxTime;
      const index = fraction * 999;
      
      const iLow = Math.floor(index);
      const iHigh = Math.ceil(index);

      let intensity = 0;
      if (iLow === iHigh) {
        intensity = curveValues[iLow] || 0;
      } else {
        // High fidelity linear interpolation between adjacent samples
        const valLow = curveValues[iLow] || 0;
        const valHigh = curveValues[iHigh] || 0;
        const factor = index - iLow;
        intensity = valLow + factor * (valHigh - valLow);
      }

      points.push({
        t: roundedTime,
        intensity: Math.max(0, Math.min(settings.maxIntensity, intensity)),
      });

      if (roundedTime >= maxTime) break;
    }

    return points;
  }, [curveValues, settings.maxTime, settings.interval, settings.maxIntensity]);

  // Handle settings adjustments safely
  const handleSettingsChange = (newSettings: SamplingSettings) => {
    setSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col selection:bg-indigo-50 selection:text-indigo-900 font-sans antialiased text-slate-800">
      
      {/* Premium Minimal Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 sticky top-0 z-30 flex-shrink-0 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-sm">TI</div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              TI-Plotter <span className="text-slate-400 font-normal text-xs">v1.2.0</span>
            </h1>
            <p className="hidden md:block text-[10px] text-slate-400 -mt-0.5 font-medium tracking-wide">
              Time-Intensity Curve Sampler & Data Broadcaster
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs as Clean Pill Control */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setMode('freehand')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all cursor-pointer ${
              mode === 'freehand'
                ? 'bg-white text-indigo-600 shadow-xs ring-1 ring-black/5'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab-mode-freehand"
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>自由描画 (Freehand)</span>
          </button>
          <button
            onClick={() => setMode('realtime')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all cursor-pointer ${
              mode === 'realtime'
                ? 'bg-white text-indigo-600 shadow-xs ring-1 ring-black/5'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab-mode-realtime"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>リアルタイム (Recorder)</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Core Drawing Box Layout */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {mode === 'freehand' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Interactive Canvas area */}
              <div className="lg:col-span-8">
                <TICanvas
                  settings={settings}
                  curveValues={curveValues}
                  onCurveChange={setCurveValues}
                  sampledPoints={sampledPoints}
                />
              </div>

              {/* Instructions Side Drawer */}
              <div className="lg:col-span-4 bg-slate-50 border border-slate-100 rounded-xl p-6 space-y-5 self-stretch flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
                    <BookOpen className="w-4 h-4 text-slate-500" />
                    <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">
                      自由描画のご案内
                    </h3>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-3 list-disc pl-4 mt-4 leading-relaxed">
                    <li>キャンバス上の好きな場所にマウスで絵を描くようにドラッグ、またはスマホ画面を指でなぞって直感的に描画できます。</li>
                    <li>
                      どのような速度で描画しても、座標間の隙間を<b>自動的に線形補完</b>するため、常に途切れのない滑らかな時系列曲線が生成されます。
                    </li>
                    <li>
                      下部の設定パネルから測定スケールやサンプリング周波数を即時に変更し、目的の分解能で座標データを取り出せます。
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">💡 臨床・感覚評価活用例：</span>
                  味覚（甘味・苦味）の時間的衰退プロファイル、リハビリテーション時の経時痛覚(Pain-Intensity)評価、化粧品の使用感の過渡的特性、音声シグナルの時間軸パラメータ。
                </div>
              </div>

            </div>
          ) : (
            <div>
              <TIRecorder
                settings={settings}
                curveValues={curveValues}
                onCurveChange={setCurveValues}
              />
            </div>
          )}
        </div>

        {/* Data points table & Settings controller spacing */}
        <div className="border-t border-slate-200/60 pt-2">
          <TIDataPreview
            settings={settings}
            onSettingsChange={handleSettingsChange}
            sampledPoints={sampledPoints}
          />
        </div>

        {/* Deploy Step-by-Step Manual Panel */}
        <div className="pt-6 border-t border-slate-200">
          <div className="flex items-center space-x-2 mb-4">
            <DownloadCloud className="w-4 h-4 text-slate-450" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">デプロイメント・ガイド (Vercel Integration)</h2>
          </div>
          <TIHelpModal />
        </div>

      </main>

      {/* Styled Footer */}
      <footer className="bg-white border-t border-slate-200 text-slate-400 py-6 mt-12 text-xs flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="font-mono text-[10px]">TIME-INTENSITY CURVE SAMPLER • DESIGNED FOR HIGH-FIDELITY DEPLOYMENT</p>
          </div>
          <div className="text-slate-400 text-center md:text-right font-light">
            <span>Powered by React, Tailwind CSS and Vite. Single-page client architecture.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
