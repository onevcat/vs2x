import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiUploadCloud, FiGlobe, FiDownloadCloud, FiLoader, FiInfo, FiAlertTriangle, FiCopy, FiCheck, FiGithub } from 'react-icons/fi';
import { parseVscodeTheme, ParsedVscodeTheme } from './utils/vscodeThemeParser';
import { generateXcodeTheme } from './utils/xcodeThemeGenerator';
import stripJsonComments from 'strip-json-comments';
import './index.css';

function App() {
  const { t, i18n } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedTheme, setParsedTheme] = useState<ParsedVscodeTheme | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Theme Handling ---
  useEffect(() => {
    // Always apply dark class
    document.documentElement.classList.add('dark');
    // Optionally remove the class on cleanup if needed, though likely not for permanent dark mode
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  // --- Language Handling ---
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // --- File Handling & Parsing ---
  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setParsedTheme(null);
    setIsProcessing(true); // Start processing
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        if (!jsonString) throw new Error('File content is empty');
        // Simulate processing time for visual feedback
        setTimeout(() => {
          try {
            const json = JSON.parse(stripJsonComments(jsonString));
            let theme = parseVscodeTheme(json);
            if (!json.name && file.name) {
              const name = file.name.replace(/\.[^.]+$/, '');
              theme = { ...theme, name };
            }
            setParsedTheme(theme);
            setIsProcessing(false); // End processing
          } catch (err) { // Changed from err: any
            console.error("Parsing error:", err);
            setParseError(t('parsingError') + (err instanceof Error ? `: ${err.message}` : ''));
            setIsProcessing(false); // End processing on error
          }
        }, 500); // Simulate 500ms processing
      } catch (err) { // Changed from err: any
        console.error("Initial reading error:", err);
        setParseError(t('readFileError'));
        setIsProcessing(false); // End processing on error
      }
    };
    reader.onerror = (e) => {
      console.error("Reading error:", e);
      setParseError(t('readFileError'));
      setIsProcessing(false); // End processing on error
    };
    reader.readAsText(file);
  }, [t]);

  // --- Drag & Drop Handlers ---
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json') || file.name.endsWith('.jsonc')) {
        handleFileSelected(file);
      } else {
        setParseError('Please drop a valid JSON theme file.'); // Consider translating this
      }
    }
  }, [handleFileSelected]);

  // --- Conversion & Download ---
  const handleConvert = () => {
    if (!parsedTheme || isProcessing) return;
    setIsProcessing(true); // Indicate processing for download generation
    try {
      // Simulate generation time
      setTimeout(() => {
        try {
          const xml = generateXcodeTheme(parsedTheme);
          const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
          const filename = `${parsedTheme.name || 'theme'}.xccolortheme`;
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          setIsProcessing(false); // End processing
          setTimeout(() => {
            URL.revokeObjectURL(link.href);
            document.body.removeChild(link);
          }, 100);
        } catch (error) {
          console.error("Conversion error:", error);
          setParseError('Failed to generate Xcode theme.'); // Consider translating this
          setIsProcessing(false); // End processing on error
        }
      }, 300); // Simulate 300ms generation
    } catch (error) {
      // Catch potential immediate errors if any (though unlikely here)
      console.error("Immediate conversion error:", error);
      setParseError('Failed to initiate theme generation.');
      setIsProcessing(false);
    }
  };

  // --- Copy Path ---
  const copyXcodePath = () => {
    const path = '~/Library/Developer/Xcode/UserData/FontAndColorThemes/';
    navigator.clipboard.writeText(path).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Hide after 2 seconds
    }, (err) => {
      console.error('Failed to copy path: ', err);
      // Maybe show an error message to the user
    });
  };

  // --- Render Helper Components ---
  const InfoCard = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <div className="bg-gray-800/60 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center mb-3">
        <Icon className="w-6 h-6 mr-3 text-white flex-shrink-0" />
        <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
      </div>
      <div className="text-sm text-gray-300 space-y-2">
        {children}
      </div>
    </div>
  );

  const ThemeInfoDisplay = ({ theme }: { theme: ParsedVscodeTheme }) => (
    <div className="mt-6 text-sm text-gray-300 space-y-1">
      <p><strong>{t('themeName')}</strong> <span className="font-mono break-all">{theme.name || t('notAvailable')}</span></p>
      <p><strong>{t('themeType')}</strong> {theme.type}</p>
      <p><strong>{t('themeBgColor')}</strong> <span className="font-mono break-all">{theme.colors['editor.background'] || t('notAvailable')}</span></p>
      <p><strong>{t('themeFgColor')}</strong> <span className="font-mono break-all">{theme.colors['editor.foreground'] || t('notAvailable')}</span></p>
      <p><strong>{t('themeTokenCount')}</strong> {theme.tokenColors.length}</p>
      <p><strong>{t('themeSemanticHighlighting')}</strong> {theme.semanticHighlighting ? t('yes') : t('no')}</p>
      <p><strong>{t('themeSemanticTokenCount')}</strong> {Object.keys(theme.semanticTokenColors || {}).length}</p>
    </div>
  );

  return (
    <div className="min-h-screen dark bg-gradient-to-br from-gray-900 to-blue-900/50 text-gray-100 transition-colors duration-300 font-sans">
      {/* Header with Controls */}
      <header className="sticky top-0 z-30 w-full bg-gray-800/80 backdrop-blur-md border-b border-gray-700/50 shadow-sm">
        <div className="w-3/4 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo */}
            <div className="text-xl font-bold text-white">
              VS2X
            </div>
            {/* Right: Controls */}
            <div className="flex items-center space-x-4">
              {/* Language Switcher */}
              <div className="relative">
                <select
                  onChange={(e) => changeLanguage(e.target.value)}
                  value={i18n.language}
                  className="appearance-none bg-transparent border border-gray-600 rounded-md py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-200"
                  aria-label={t('language')}
                >
                  <option value="en">EN</option>
                  <option value="zh">中文</option>
                </select>
                <FiGlobe className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* GitHub Button */}
              <a
                href="https://github.com/onevcat/vs2x"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="GitHub Repository"
              >
                <FiGithub className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-3/4 mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">

        {/* Hero Section */}
        <div className="text-center mb-12 md:mb-16 lg:mb-20">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-3">
            {t('appTitle')}
          </h1>
          <h2 className="text-lg md:text-xl lg:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-gray-100 mb-4">
            {t('appSubtitle')}
          </h2>
          <p className="text-md md:text-lg text-gray-400 font-medium">
            {t('appSlogan')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left/Top: Upload & Info Area */}
          <div className="lg:col-span-2 bg-gray-800/60 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
            {/* File Uploader */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 
                ${isDragging ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600 hover:border-gray-500'}
                ${selectedFile && !parseError ? 'border-green-500 bg-green-900/30' : ''}
                ${parseError ? 'border-red-500 bg-red-900/30' : ''}`
              }
            >
              <input
                type="file"
                accept=".json,.jsonc"
                onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" // Hidden input
                id="file-upload"
                disabled={isProcessing} // Disable during processing
              />
              <label htmlFor="file-upload" className={`cursor-pointer ${isProcessing ? 'cursor-wait' : ''}`}>
                {isProcessing ? (
                  <FiLoader className="mx-auto h-12 w-12 mb-4 text-gray-400 animate-spin" />
                ) : (
                  <FiUploadCloud className={`mx-auto h-12 w-12 mb-4 transition-colors duration-300 
                    ${selectedFile && !parseError ? 'text-green-400' : 'text-gray-500'}
                    ${parseError ? 'text-red-400' : ''}`} />
                )}
                <h3 className="text-lg font-semibold text-gray-100 mb-2">{t('uploadAreaTitle')}</h3>
                <p className="text-sm text-gray-400 mb-4">{t('uploadAreaDescription')}</p>
                <span className={`inline-block px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300 
                  ${selectedFile && !parseError ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}
                  ${parseError ? 'bg-red-900/50 text-red-300' : ''}
                  ${isProcessing ? 'opacity-50' : ''}`
                }>
                  {selectedFile ? t('fileSelected') : t('uploadAreaButton')}
                </span>
                {selectedFile && <p className="mt-3 text-xs font-mono text-gray-400 break-all">{selectedFile.name}</p>}
              </label>
            </div>

            {/* Parse Error Display */}
            {parseError && (
              <div className="mt-6 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
                {parseError}
              </div>
            )}

            {/* Convert Button - Moved Here */}
            <div className="mt-8 text-center">
              <button
                onClick={handleConvert}
                disabled={!parsedTheme || isProcessing}
                className={`px-10 py-4 rounded-lg text-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 w-full sm:w-auto sm:inline-flex 
                  ${parsedTheme && !isProcessing
                    ? 'bg-green-700 hover:bg-green-500 text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed shadow-inner'}`
                }
              >
                {isProcessing ? <FiLoader className="w-5 h-5 animate-spin"/> : <FiDownloadCloud className="w-5 h-5"/>}
                <span>{isProcessing ? 'Processing...' : t('convertAndDownload')}</span>
              </button>
            </div>

            {/* Parsed Theme Info */}
            {parsedTheme && !isProcessing && (
              <div className="mt-8 p-6 rounded-xl bg-gray-700/30">
                <h4 className="font-bold mb-3 text-gray-100">{t('themeInfoTitle')}</h4>
                <ThemeInfoDisplay theme={parsedTheme} />
              </div>
            )}
          </div>

          {/* Right/Bottom: Instructions & Disclaimer */}
          <div className="lg:col-span-1 space-y-8">
            <InfoCard icon={FiInfo} title={t('instructionsTitle')}>
              <ol className="list-decimal list-inside space-y-2">
                <li>{t('instructionsStep1')}</li>
                <li>
                  {t('instructionsStep2')}
                  <div className="mt-2 flex items-center space-x-2 bg-gray-700 p-2 rounded-md">
                    <code className="text-xs font-mono break-all flex-grow">~/Library/Developer/Xcode/UserData/FontAndColorThemes/</code>
                    <button
                      onClick={copyXcodePath}
                      title={copySuccess ? t('pathCopiedButton') : t('copyPathButton')}
                      className={`p-1.5 rounded-md transition-colors ${copySuccess ? 'bg-green-500 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-300'}`}
                    >
                      {copySuccess ? <FiCheck className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                    </button>
                  </div>
                </li>
                <li>{t('instructionsStep3')}</li>
              </ol>
            </InfoCard>

            <InfoCard icon={FiAlertTriangle} title={t('disclaimerTitle')}>
              <p>{t('disclaimerText')}</p>
            </InfoCard>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-white py-8 mt-12 select-none">
        Made with <span className="text-pink-400">♥</span> by <a className="underline" href='https://github.com/onevcat'>@onevcat</a>
      </footer>
    </div>
  );
}

export default App;
