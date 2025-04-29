import React, { useState } from 'react';
import FileUploader from './components/FileUploader';
import HeroGradientBg from './components/HeroGradientBg';
import { parseVscodeTheme, ParsedVscodeTheme } from './utils/vscodeThemeParser';
import { generateXcodeTheme } from './utils/xcodeThemeGenerator';
import stripJsonComments from 'strip-json-comments';
import './index.css';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedTheme, setParsedTheme] = useState<ParsedVscodeTheme | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // 处理文件上传并解析主题
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setParsedTheme(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // 去除注释后再 parse
        const json = JSON.parse(stripJsonComments(e.target?.result as string));
        let theme = parseVscodeTheme(json);
        // 如果没有 name 字段，用文件名（去除扩展名）
        if (!json.name && file.name) {
          const name = file.name.replace(/\.[^.]+$/, '');
          theme = { ...theme, name };
        }
        setParsedTheme(theme);
      } catch (err: any) {
        setParseError(err.message || '解析 VSCode 主题失败');
      }
    };
    reader.onerror = () => setParseError('读取文件失败');
    reader.readAsText(file);
  };

  // 处理转换按钮点击（后续实现）
  // 主题转换与下载
  const handleConvert = () => {
    if (!parsedTheme) return;
    const xml = generateXcodeTheme(parsedTheme);
    const blob = new Blob([xml], { type: 'application/xml' });
    // 文件名用主题名
    const filename = `${parsedTheme.name || 'theme'}.xccolortheme`;
    // 创建下载链接
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      document.body.removeChild(link);
    }, 100);
  };


  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-[#f8fafc] to-[#e0e7ef] px-4 overflow-hidden">
      <HeroGradientBg />
      {/* Hero 区域 */}
      <header className="relative z-10 w-full max-w-2xl mx-auto text-center pt-40 pb-10">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight drop-shadow-sm">
          VSCode → Xcode Theme Converter
        </h1>
        <p className="text-xl md:text-2xl text-gray-500 font-medium mb-2">
          让你的开发环境美学无缝切换
        </p>
      </header>
      {/* 上传区域 */}
      <main className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center">
        <div className="w-full">
          <div className="rounded-2xl shadow-xl bg-white/80 backdrop-blur-md border border-gray-200 px-8 py-12 mb-6 hover:shadow-2xl transition-all">
            <FileUploader onFileSelected={handleFileSelected} />
          </div>
          <button
            className={`w-full py-3 text-lg font-semibold rounded-xl transition-all duration-150
              ${selectedFile ? 'bg-blue-600 text-white hover:bg-blue-700 shadow' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            disabled={!selectedFile}
            onClick={handleConvert}
          >
            转换并下载 Xcode 主题
          </button>
          {/* 开发阶段：显示解析信息 */}
          {(parsedTheme || parseError) && (
            <div className="mt-8 p-4 rounded-xl bg-gray-50 border border-gray-200 text-left text-sm text-gray-700 shadow-sm">
              <div className="font-bold mb-2 text-gray-900">解析结果</div>
              {parseError ? (
                <div className="text-red-500">{parseError}</div>
              ) : parsedTheme && (
                <div>
                  <div>主题名：<span className="font-mono">{parsedTheme.name}</span></div>
                  <div>类型：{parsedTheme.type}</div>
                  <div>主背景色：<span className="font-mono">{parsedTheme.colors['editor.background'] || '无'}</span></div>
                  <div>主前景色：<span className="font-mono">{parsedTheme.colors['editor.foreground'] || '无'}</span></div>
                  <div>token 数量：{parsedTheme.tokenColors.length}</div>
                  <div>semanticHighlighting：{parsedTheme.semanticHighlighting ? '是' : '否'}</div>
                  <div>semanticTokenColors：{Object.keys(parsedTheme.semanticTokenColors).length} 项</div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <footer className="relative z-10 text-center text-xs text-gray-400 mt-24 mb-6 select-none">
        Made with <span className="text-pink-400">♥</span> by vs2x
      </footer>
    </div>
  );
}

export default App;
