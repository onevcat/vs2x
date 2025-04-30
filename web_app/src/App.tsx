import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiUploadCloud, FiSun, FiMoon, FiGlobe, FiDownloadCloud, FiLoader, FiInfo, FiAlertCircle, FiCopy, FiCheck } from 'react-icons/fi'; // Re-added FiCopy, FiCheck, Added FiInfo, FiAlertCircle
import { Switch } from '@headlessui/react';
import { parseVscodeTheme, ParsedVscodeTheme } from './utils/vscodeThemeParser';
import { generateXcodeTheme } from './utils/xcodeThemeGenerator';
import stripJsonComments from 'strip-json-comments';
import './index.css';

function App() {
  const { t, i18n } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedTheme, setParsedTheme] = useState<ParsedVscodeTheme | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false); // Restored state
  const [isProcessing, setIsProcessing] = useState(false); // Added processing state

  // --- Theme Handling ---
  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      setIsDarkMode(prefersDark);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

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
  // Restored function
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
  // Restored component
  const InfoCard = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    // Removed border, increased rounding and shadow
    <div className="bg-white dark:bg-gray-800/60 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center mb-3">
        <Icon className="w-6 h-6 mr-3 text-blue-500 dark:text-blue-400 flex-shrink-0" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
        {children}
      </div>
    </div>
  );

  const ThemeInfoDisplay = ({ theme }: { theme: ParsedVscodeTheme }) => (
    <div className="mt-6 text-sm text-gray-700 dark:text-gray-300 space-y-1">
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
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''} bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/50 text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans`}>
      {/* Header with Controls */}
      <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/50 shadow-sm">
        {/* Reduced max-width and centered */}
        {/* Changed max-w-6xl to w-3/4 */}
        <div className="w-3/4 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end items-center h-16"> {/* Changed justify-between to justify-end */}
            {/* Right: Controls */}
            <div className="flex items-center space-x-4">
              {/* Language Switcher */}
              <div className="relative">
                <select
                  onChange={(e) => changeLanguage(e.target.value)}
                  value={i18n.language}
                  className="appearance-none bg-transparent border border-gray-300 dark:border-gray-600 rounded-md py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:text-gray-200"
                  aria-label={t('language')}
                >
                  <option value="en">EN</option>
                  <option value="zh">ZH</option>
                </select>
                <FiGlobe className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Theme Toggle */}
              <Switch
                checked={isDarkMode}
                onChange={toggleTheme}
                className={`${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'}
                  relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800`}
                aria-label={isDarkMode ? t('switchToLight') : t('switchToDark')}
              >
                <span className="sr-only">{isDarkMode ? t('switchToLight') : t('switchToDark')}</span>
                <span className={`${isDarkMode ? 'translate-x-6' : 'translate-x-1'}
                    inline-block w-4 h-4 transform bg-white rounded-full transition-transform flex items-center justify-center shadow`}
                >
                  {isDarkMode ? <FiMoon className="w-3 h-3 text-blue-600" /> : <FiSun className="w-3 h-3 text-gray-500" />}
                </span>
              </Switch>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {/* Reduced max-width and centered */}
      {/* Changed max-w-6xl to w-3/4 */}
      <main className="w-3/4 mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">

        {/* Hero Section */}
        <div className="text-center mb-12 md:mb-16 lg:mb-20">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white mb-3 text-red-500">
            {t('appTitle')}
          </h1>
          <h2 className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-4">
            {t('appSubtitle')}
          </h2>
          <p className="text-md md:text-lg text-gray-500 dark:text-gray-400 font-medium">
            {t('appSlogan')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left/Top: Upload & Info Area */}
          {/* Increased rounding and shadow, removed border */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800/60 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
            {/* File Uploader */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 
                ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
                ${selectedFile && !parseError ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : ''}
                ${parseError ? 'border-red-500 bg-red-50 dark:bg-red-900/30' : ''}`}
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
                  <FiLoader className="mx-auto h-12 w-12 mb-4 text-blue-500 dark:text-blue-400 animate-spin" />
                ) : (
                  <FiUploadCloud className={`mx-auto h-12 w-12 mb-4 transition-colors duration-300 
                    ${selectedFile && !parseError ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}
                    ${parseError ? 'text-red-600 dark:text-red-400' : ''}`} />
                )}
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('uploadAreaTitle')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('uploadAreaDescription')}</p>
                <span className={`inline-block px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300 
                  ${selectedFile && !parseError ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}
                  ${parseError ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : ''}
                  ${isProcessing ? 'opacity-50' : ''}`}>
                  {selectedFile ? t('fileSelected') : t('uploadAreaButton')}
                </span>
                {selectedFile && <p className="mt-3 text-xs font-mono text-gray-600 dark:text-gray-400 break-all">{selectedFile.name}</p>}
              </label>
            </div>

            {/* Parse Error Display */}
            {parseError && (
              <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
                {parseError}
              </div>
            )}

            {/* Parsed Theme Info */}
            {parsedTheme && !isProcessing && (
              // Removed border, adjusted background
              <div className="mt-8 p-6 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                <h4 className="font-bold mb-3 text-gray-900 dark:text-gray-100">{t('themeInfoTitle')}</h4>
                <ThemeInfoDisplay theme={parsedTheme} />
              </div>
            )}

            {/* Convert Button - Moved Here */}
            <div className="mt-8 text-center">
              <button
                onClick={handleConvert}
                disabled={!parsedTheme || isProcessing} // Disable if no theme or processing
                // Adjusted padding (px-6 py-5) and background color (bg-green-500, hover:bg-green-600)
                className={`px-6 py-5 rounded-lg text-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 w-full sm:w-auto sm:inline-flex 
                  ${parsedTheme && !isProcessing
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900 transform hover:scale-105'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-inner'}`}
              >
                {isProcessing ? <FiLoader className="w-5 h-5 animate-spin"/> : <FiDownloadCloud className="w-5 h-5"/>}
                <span>{isProcessing ? 'Processing...' : t('convertAndDownload')}</span> {/* Add Processing text */}
              </button>
            </div>
          </div>

          {/* Right/Bottom: Instructions & Disclaimer */}
          {/* Added InfoCards for instructions and disclaimer */}
          <div className="lg:col-span-1 space-y-8">
            <InfoCard icon={FiInfo} title={t('instructionsTitle')}>
              <ol className="list-decimal list-inside space-y-2">
                <li>{t('instructionsStep1')}</li>
                <li>
                  {t('instructionsStep2')}
                  <div className="mt-2 flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                    <code className="text-xs font-mono break-all flex-grow">~/Library/Developer/Xcode/UserData/FontAndColorThemes/</code>
                    <button
                      onClick={copyXcodePath}
                      title={copySuccess ? t('pathCopiedButton') : t('copyPathButton')}
                      className={`p-1.5 rounded-md transition-colors ${copySuccess ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300'}`}
                    >
                      {copySuccess ? <FiCheck className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                    </button>
                  </div>
                </li>
                <li>{t('instructionsStep3')}</li>
              </ol>
            </InfoCard>

            <InfoCard icon={FiAlertCircle} title={t('disclaimerTitle')}>
              <p>{t('disclaimerText')}</p>
            </InfoCard>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 dark:text-gray-500 py-8 mt-12 select-none">
        Made with <span className="text-pink-500 dark:text-pink-400">♥</span> by vs2x
      </footer>
    </div>
  );
}

export default App;
