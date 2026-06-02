import { Github, ExternalLink, Info } from 'lucide-react';

export default function TIHelpModal() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col space-y-5">
      
      <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
        <Github className="w-4 h-4 text-slate-600" />
        <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest font-mono">
          GitHub ➔ Vercel へのスピードデプロイ手順書 (Deployment)
        </h3>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
        このツールは特別なバックエンド不要の完全なSPA（シングルページアプリケーション）として設計されています。
        そのため、以下のシンプルな3つの段取りだけで、GitHubを通じてVercel上に永久・無料でホスティング（全世界公開）を設定できます。
      </p>

      {/* Steps List */}
      <div className="space-y-4">
        
        {/* Step 1 */}
        <div className="bg-slate-50/60 p-5 rounded-lg border border-slate-200/60">
          <div className="flex items-center space-x-2.5 mb-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-105 border border-slate-300 text-[10px] text-slate-700 font-bold font-mono">1</span>
            <h4 className="text-sm font-semibold text-slate-800">GitHubリポジトリの作成とプッシュ</h4>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            ZIPダウンロードなどから抽出した全ファイルをローカルの任意のフォルダに配置し、そのフォルダ内で以下のGitコマンドを実行してプッシュします。
          </p>
          <pre className="p-3.5 bg-slate-905 border border-slate-200 text-[10px] md:text-xs text-slate-750 font-mono rounded-lg overflow-x-auto space-y-1 select-all bg-slate-100">
            {`# gitの初期化
git init

# 全てのファイルをステージング
git add .
git commit -m "feat: init Time-Intensity curve drawing tool"

# メインブランチをmainに強制
git branch -M main

# リモートリポジトリの登録（事前にGitHub上で作成した空リポジトリのアドレスをご指定ください）
git remote add origin https://github.com/【ユーザー名】/【リポジトリ名】.git

# アップロード実行！
git push -u origin main`}
          </pre>
        </div>

        {/* Step 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="bg-slate-50/60 p-5 rounded-lg border border-slate-200/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-105 border border-slate-300 text-[10px] text-slate-700 font-bold font-mono">2</span>
                <h4 className="text-sm font-semibold text-slate-800">Vercelアカウント作成 & 連携</h4>
              </div>
              <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4 leading-relaxed">
                <li>
                  <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center space-x-0.5 font-medium">
                    <span>Vercel (vercel.com)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a> にログインします。
                </li>
                <li>GitHubのソーシャルログインを選択してサインアップします。</li>
                <li>ダッシュボード画面右上から <b>「Add New」 ➔ 「Project」</b> をクリックします。</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-50/60 p-5 rounded-lg border border-slate-200/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-105 border border-slate-300 text-[10px] text-slate-700 font-bold font-mono">3</span>
                <h4 className="text-sm font-semibold text-slate-800">デプロイ (Deploy) 実行</h4>
              </div>
              <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4 leading-relaxed">
                <li>先ほどGitHubにアップした該当リポジトリの横の <b>「Import」</b> を押します。</li>
                <li>Framework Presetが「<b>Vite</b>」に自動識別されるのを確認します。</li>
                <li>環境設定などは不要ですので、そのまま <b>「Deploy」</b> を押せば約数十秒で全世界公開用の本番Webアドレスが自動発行されます。</li>
              </ul>
            </div>
          </div>

        </div>

      </div>

      {/* Deployment notes */}
      <div className="flex items-start space-x-2 p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-lg text-xs leading-relaxed text-indigo-950 font-medium font-sans">
        <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div>
          <b>📝 Vercel継続的インテグレーション(CI)の恩恵:</b> 今後、座標系機能の強化やデザインの修正をGitHub上でプッシュするだけで、Vercelが自動ビルドをトリガーし、常に最新の変更をサーバーへ秒速自動反映してくれます。
        </div>
      </div>

    </div>
  );
}
