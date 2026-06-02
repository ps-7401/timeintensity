import { SamplingSettings, CurvePoint } from '../types';
import { Download, Table, Settings, Compass, Info } from 'lucide-react';

interface TIDataPreviewProps {
  settings: SamplingSettings;
  onSettingsChange: (settings: SamplingSettings) => void;
  sampledPoints: CurvePoint[];
}

export default function TIDataPreview({
  settings,
  onSettingsChange,
  sampledPoints,
}: TIDataPreviewProps) {
  // Handle field updates
  const updateSetting = <K extends keyof SamplingSettings>(key: K, value: SamplingSettings[K]) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  // Safe arithmetic for stats
  const calculateStats = () => {
    if (sampledPoints.length === 0) return { peak: 0, timeToPeak: 0, auc: 0, duration: 0 };

    let peak = 0;
    let timeToPeak = 0;
    let auc = 0;
    let duration = 0;

    // Peak and Time-to-Peak
    sampledPoints.forEach((pt) => {
      if (pt.intensity > peak) {
        peak = pt.intensity;
        timeToPeak = pt.t;
      }
      if (pt.intensity > 0.05) {
        duration += settings.interval; // count active duration
      }
    });

    // Trapezoidal rule for Area Under Curve (AUC)
    for (let i = 0; i < sampledPoints.length - 1; i++) {
      const p1 = sampledPoints[i];
      const p2 = sampledPoints[i + 1];
      const deltaT = p2.t - p1.t;
      auc += ((p1.intensity + p2.intensity) / 2) * deltaT;
    }

    return {
      peak,
      timeToPeak,
      auc,
      duration: Math.min(settings.maxTime, duration),
    };
  };

  const stats = calculateStats();

  // Export to CSV
  const handleDownloadCSV = () => {
    const csvRows = [
      ['Time (seconds)', `Intensity (${settings.attributeName})`], // Headers
    ];

    sampledPoints.forEach((pt) => {
      csvRows.push([pt.t.toFixed(3), pt.intensity.toFixed(2)]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + csvRows.map((e) => e.join(',')).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);

    // Format clean filename based on attribute name
    const cleanAttr = settings.attributeName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    link.setAttribute('download', `time_intensity_${cleanAttr}_${settings.interval}s.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Settings Form Column */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col space-y-5">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest font-mono">
            サンプリング設定 (Export Config)
          </h3>
        </div>

        {/* Attribute Input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            評価属性名 (Attribute Name)
          </label>
          <input
            type="text"
            className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white transition-all text-slate-800 font-medium"
            value={settings.attributeName}
            onChange={(e) => updateSetting('attributeName', e.target.value)}
            placeholder="例: Sweetness, Bitterness, Pain"
            id="input-attribute-name"
          />
          <p className="text-[10px] text-slate-400 mt-1.5 italic">
            CSVヘッダーおよび出力ファイル名のプレフィックスに使用されます。
          </p>
        </div>

        {/* Max Time Setting */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 justify-between flex">
            <span>最大計測時間 (Max Time)</span>
            <span className="text-indigo-600 font-mono font-bold">{settings.maxTime}秒</span>
          </label>
          <input
            type="range"
            min="10"
            max="180"
            step="5"
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 my-2"
            value={settings.maxTime}
            onChange={(e) => updateSetting('maxTime', Number(e.target.value))}
            id="input-max-time"
          />
          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
            <span>10s</span>
            <span>60s (標準)</span>
            <span>120s</span>
            <span>180s</span>
          </div>
        </div>

        {/* Max Intensity Setting */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 justify-between flex">
            <span>最大強度スケール (Max Intensity)</span>
            <span className="text-indigo-600 font-mono font-bold">{settings.maxIntensity}</span>
          </label>
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 my-2"
            value={settings.maxIntensity}
            onChange={(e) => updateSetting('maxIntensity', Number(e.target.value))}
            id="input-max-intensity"
          />
          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
            <span>10 (小スケール)</span>
            <span>100 (%)</span>
            <span>1000 (高解像)</span>
          </div>
        </div>

        {/* Interfacing Interval Picker */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            サンプリング間隔 (Interval / Hz)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[0.1, 0.2, 0.5, 1.0, 2.0, 5.0].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => updateSetting('interval', sec)}
                className={`py-2 px-1.5 rounded-lg text-[10px] font-semibold font-mono border transition-all cursor-pointer ${
                  settings.interval === sec
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
                id={`btn-interval-${sec.toString().replace('.', '_')}`}
              >
                {1 / sec >= 1 ? `${(1 / sec).toFixed(0)}Hz` : `${sec}s`} ({sec}s)
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Metrics & Table Column */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        
        {/* Sensory Metrics Statistics Panel - Clean Light Minimalist */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border-r border-slate-100 pr-2">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">ピーク強度 (Imax)</span>
            <span className="text-xl md:text-2xl font-light font-mono text-emerald-600">{stats.peak.toFixed(1)}</span>
          </div>
          <div className="border-r border-slate-100 md:pr-2 pl-2 md:pl-0">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">ピーク時間 (Tmax)</span>
            <span className="text-xl md:text-2xl font-light font-mono text-slate-800">{stats.timeToPeak.toFixed(1)}s</span>
          </div>
          <div className="border-r border-slate-100 pr-2 pl-0 md:pl-2">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">曲線下面積 (AUC)</span>
            <span className="text-xl md:text-2xl font-light font-mono text-indigo-600">{stats.auc.toFixed(0)}</span>
          </div>
          <div className="pl-2">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">感覚持続時間</span>
            <span className="text-xl md:text-2xl font-light font-mono text-slate-700">{stats.duration.toFixed(1)}s</span>
          </div>
        </div>

        {/* Data points visual table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col flex-1 min-h-[220px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <Table className="w-4 h-4 text-slate-400" />
              <div className="flex flex-col">
                <h3 className="font-display font-semibold text-slate-800 text-sm">
                  サンプリング座標データプレビュー
                </h3>
                <span className="text-[9px] text-slate-400 font-mono">
                  Captured: {sampledPoints.length} coordinate pairs
                </span>
              </div>
            </div>

            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-900 border border-slate-950 text-white font-semibold text-xs shadow-xs hover:bg-black transition-all cursor-pointer"
              id="btn-download-csv"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSVを出力する (Export)</span>
            </button>
          </div>

          {/* Render point tables with maximum 100 items shown, scrollable */}
          <div className="relative overflow-auto max-h-[160px] border border-slate-200/50 rounded-lg flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200/65 uppercase tracking-widest font-bold font-mono text-[9px] sticky top-0">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">時間 (Time Axis)</th>
                  <th className="py-2 px-3">強度 (Intensity Value)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-650">
                {sampledPoints.slice(0, 100).map((pt, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-3 text-slate-450">{idx + 1}</td>
                    <td className="py-1.5 px-3">{pt.t.toFixed(2)}s</td>
                    <td className="py-1.5 px-3 font-semibold text-indigo-600">{pt.intensity.toFixed(2)}</td>
                  </tr>
                ))}
                {sampledPoints.length > 100 && (
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-center text-slate-400 italic bg-slate-50 text-[10px]">
                      残り {sampledPoints.length - 100} 件 of 座標データ is omitted. CSV download produces the full data stream.
                    </td>
                  </tr>
                )}
                {sampledPoints.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400 italic font-sans">
                      描画を行ってデータ点を生成してください
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
