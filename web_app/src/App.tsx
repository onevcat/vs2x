import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiUploadCloud, FiSun, FiMoon, FiCopy, FiCheck, FiGlobe, FiFileText, FiSettings, FiDownloadCloud, FiAlertTriangle } from 'react-icons/fi';
import { Switch } from '@headlessui/react';
import { parseVscodeTheme, ParsedVscodeTheme } from './utils/vscodeThemeParser';
import { generateXcodeTheme } from './utils/xcodeThemeGenerator';
import stripJsonComments from 'strip-json-comments';
import './index.css'; // Ensure global styles are imported

function App() {
  const { t, i18n } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedTheme, setParsedTheme] = useState<ParsedVscodeTheme | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        if (!jsonString) throw new Error('File content is empty');
        const json = JSON.parse(stripJsonComments(jsonString));
        let theme = parseVscodeTheme(json);
        if (!json.name && file.name) {
          const name = file.name.replace(/\.[^.]+$/, '');
          theme = { ...theme, name };
        }
        setParsedTheme(theme);
      } catch (err: any) { // Catch JSON parsing errors specifically
        console.error("Parsing error:", err);
        setParseError(t('parsingError') + (err instanceof Error ? `: ${err.message}` : ''));
      }
    };
    reader.onerror = (e) => {
      console.error("Reading error:", e);
      setParseError(t('readFileError'));
    };
    reader.readAsText(file);
  }, [t]); // Add t to dependency array

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
    if (!parsedTheme) return;
    try {
      const xml = generateXcodeTheme(parsedTheme);
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      const filename = `${parsedTheme.name || 'theme'}.xccolortheme`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 100);
    } catch (error) {
      console.error("Conversion error:", error);
      setParseError('Failed to generate Xcode theme.'); // Consider translating this
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
    <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center mb-3">
        <Icon className="w-6 h-6 mr-3 text-blue-500 dark:text-blue-400" />
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
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans`}>
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Title & Subtitle */}
            <div className="flex items-baseline space-x-4">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{t('appTitle')}</span>
              <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">{t('appSubtitle')}</span>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center space-x-4">
              {/* Convert Button */}
              <button
                onClick={handleConvert}
                disabled={!parsedTheme}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 flex items-center space-x-2 
                  ${parsedTheme
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`}
              >
                <FiDownloadCloud className="w-4 h-4"/>
                <span>{t('convertAndDownload')}</span>
              </button>

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
                    inline-block w-4 h-4 transform bg-white rounded-full transition-transform flex items-center justify-center`}
                >
                  {isDarkMode ? <FiMoon className="w-3 h-3 text-blue-600" /> : <FiSun className="w-3 h-3 text-gray-500" />}
                </span>
              </Switch>
            </div>
          </div>
          {/* Slogan (visible below header on smaller screens) */}
          <div className="sm:hidden text-center text-xs text-gray-500 dark:text-gray-400 pb-2">
            {t('appSlogan')}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Slogan (visible above main content on larger screens) */}
        <p className="hidden sm:block text-center text-lg text-gray-500 dark:text-gray-400 mb-12 font-medium">
          {t('appSlogan')}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left/Top: Upload & Info */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800/50 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 hover:shadow-2xl transition-shadow duration-300">
            {/* File Uploader */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 
                ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
                ${selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : ''}`}
            >
              <input
                type="file"
                accept=".json,.jsonc" // Accept json and jsonc files
                onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" // Hidden input
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FiUploadCloud className={`mx-auto h-12 w-12 mb-4 transition-colors duration-300 ${selectedFile ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('uploadAreaTitle')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('uploadAreaDescription')}</p>
                <span className={`inline-block px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300 
                  ${selectedFile ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}`}>
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
            {parsedTheme && (
              <div className="mt-8 p-6 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                <h4 className="font-bold mb-3 text-gray-900 dark:text-gray-100">{t('themeInfoTitle')}</h4>
                <ThemeInfoDisplay theme={parsedTheme} />
              </div>
            )}
          </div>

          {/* Right/Bottom: Instructions & Disclaimer */}
          <div className="space-y-8">
            {/* How to Use */}
            <InfoCard icon={FiFileText} title={t('howToUseTitle')}>
              <ol className="list-decimal list-inside space-y-1">
                <li><strong>{t('step1Title')}:</strong> {t('step1Description')}</li>
                <li><strong>{t('step2Title')}:</strong> {t('step2Description')}</li>
                <li><strong>{t('step3Title')}:</strong> {t('step3Description')}</li>
              </ol>
            </InfoCard>

            {/* Installation Guide */}
            <InfoCard icon={FiSettings} title={t('installationGuideTitle')}>
              <p>{t('installationGuideText')}</p>
              <div className="mt-3 flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-300 dark:border-gray-600">
                <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all flex-grow">
                  ~/Library/Developer/Xcode/UserData/FontAndColorThemes/
                </code>
                <button
                  onClick={copyXcodePath}
                  className={`p-1.5 rounded-md transition-colors duration-200 ${copySuccess ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300'}`}
                  aria-label={copySuccess ? t('pathCopied') : t('copyPath')}
                >
                  {copySuccess ? <FiCheck className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                </button>
              </div>
            </InfoCard>

            {/* Disclaimer */}
            <InfoCard icon={FiAlertTriangle} title={t('disclaimerTitle')}>
              <p>{t('disclaimerText')}</p>
            </InfoCard>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 dark:text-gray-500 py-6 select-none">
        Made with <span className="text-pink-500 dark:text-pink-400">♥</span> by vs2x
      </footer>
    </div>
  );
}

export default App;
