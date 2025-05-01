import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiUploadCloud, FiGlobe, FiDownloadCloud, FiLoader, FiInfo, FiStar, FiCopy, FiCheck, FiGithub, FiLink } from 'react-icons/fi';
import { parseVscodeTheme, ParsedVscodeTheme } from './utils/vscodeThemeParser';
import { generateXcodeTheme } from './utils/xcodeThemeGenerator';
import { parse } from 'jsonc-parser';
import './index.css';

// Define Theme Types
interface Theme {
  name: string;
  background: string;
  subtitle: string;
  tint: string
}

// Define Available Themes
const themes: Theme[] = [
  { name: 'blue', background: 'from-gray-900 to-blue-900/50', subtitle: 'from-blue-300 to-gray-100', tint: 'text-blue-300' },
  { name: 'yellow', background: 'from-gray-900 to-yellow-900/50', subtitle: 'from-yellow-300 to-gray-100', tint: 'text-yellow-300' },
  { name: 'orange', background: 'from-gray-900 to-orange-900/50', subtitle: 'from-orange-300 to-gray-100', tint: 'text-orange-300' },
  { name: 'purple', background: 'from-gray-900 to-purple-900/50', subtitle: 'from-purple-300 to-gray-100', tint: 'text-purple-300' },
  { name: 'red', background: 'from-gray-900 to-red-900/50', subtitle: 'from-red-300 to-gray-100', tint: 'text-red-300' },
  { name: 'green', background: 'from-gray-900 to-green-900/50', subtitle: 'from-green-300 to-gray-100', tint: 'text-green-300' },
];


function App() {
  const { t, i18n } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [themeUrl, setThemeUrl] = useState<string>('');
  const [isValidThemeUrl, setIsValidThemeUrl] = useState<boolean>(false); // 新增状态，用于跟踪URL有效性
  const [urlFetchSuccess, setUrlFetchSuccess] = useState<boolean>(false);
  const [parsedTheme, setParsedTheme] = useState<ParsedVscodeTheme | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // General processing state
  const [isFetchingUrl, setIsFetchingUrl] = useState(false); // Specific state for URL fetching
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

  // --- Theme Handling ---
  useEffect(() => {
    document.documentElement.classList.add('dark');
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    setCurrentTheme(randomTheme);
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  // --- Language Handling ---
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // 更新URL处理函数
  const handleThemeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setThemeUrl(newUrl);
    setUrlFetchSuccess(false);
    
    // 在输入时就验证 URL
    try {
      const url = new URL(newUrl);
      setIsValidThemeUrl(url.protocol === 'http:' || url.protocol === 'https:');
    } catch {
      setIsValidThemeUrl(false);
    }
  };

  // --- Clear State Helper ---
  const clearAllInputs = () => {
    setSelectedFile(null);
    setThemeUrl('');
    setParsedTheme(null);
    setParseError(null);
    setUrlFetchSuccess(false); // 清除时重置URL获取状态
    setIsValidThemeUrl(false);
  }

  // --- File Handling & Parsing ---
  const handleFileSelected = useCallback((file: File) => {
    clearAllInputs(); // Clear URL input and previous results
    setSelectedFile(file); // Set selected file *after* clearing
    setIsProcessing(true);
    setParseError(null); // Clear previous errors
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        if (!jsonString) throw new Error('File content is empty');
        setTimeout(() => { // Keep simulation
          try {
            // Use jsonc-parser's parse function
            const parseErrors: any[] = [];
            const json = parse(jsonString, parseErrors, { allowTrailingComma: true });

            if (parseErrors.length > 0) {
              // Handle JSONC parsing errors more specifically if needed
              const firstError = parseErrors[0];
              throw new Error(`Invalid JSONC: ${firstError.error} at offset ${firstError.offset}`);
            }

            let theme = parseVscodeTheme(json);
            if (!json.name && file.name) {
              const name = file.name.replace(/\.[^.]+$/, '');
              theme = { ...theme, name };
            }
            setParsedTheme(theme);
            setIsProcessing(false);
          } catch (err) {
            console.error("Parsing error:", err);
            setParseError(t('parsingError') + (err instanceof Error ? `: ${err.message}` : ''));
            setIsProcessing(false);
          }
        }, 500);
      } catch (err) {
        console.error("Initial reading error:", err);
        setParseError(t('readFileError'));
        setIsProcessing(false);
      }
    };
    reader.onerror = (e) => {
      console.error("Reading error:", e);
      setParseError(t('readFileError'));
      setIsProcessing(false);
    };
    reader.readAsText(file);
  }, [t]); // Removed clearAllInputs from dependencies

  // --- URL Fetching & Parsing ---
  const handleFetchFromUrl = useCallback(async () => {
    if (!themeUrl || !isValidThemeUrl || isFetchingUrl || isProcessing) return;

    clearAllInputs();
    setThemeUrl(themeUrl);
    setIsFetchingUrl(true);
    setParseError(null);

    try {
      // Use relative path for the API endpoint
      const response = await fetch('/api/fetch-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: themeUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      if (!data.themeJson) {
        throw new Error('No theme JSON found in the response');
      }

      // Parse the JSON received from the backend
      // The backend now sends parsed JSON, no need to parse again here
      const json = data.themeJson; // Use the already parsed JSON
      let theme = parseVscodeTheme(json);

      // Try to extract a name from the URL if not present in JSON
      if (!json.name) {
        try {
          const urlPath = new URL(themeUrl).pathname;
          const filename = urlPath.substring(urlPath.lastIndexOf('/') + 1);
          if (filename) {
            const name = filename.replace(/\.[^.]+$/, ''); // Remove extension
            theme = { ...theme, name };
          }
        } catch (e) {
          // Ignore errors in deriving name from URL
          console.warn("Could not derive theme name from URL:", e);
        }
      }

      setParsedTheme(theme);
      setUrlFetchSuccess(true); // 设置成功状态

    } catch (err) {
      console.error("URL Fetch/Parse error:", err);
      setParseError(t('fetchUrlError') + (err instanceof Error ? `: ${err.message}` : ''));
      setUrlFetchSuccess(false); // 确保失败时重置状态
    } finally {
      setIsFetchingUrl(false);
    }
  }, [themeUrl, isValidThemeUrl, isFetchingUrl, isProcessing, t]); // Removed clearAllInputs from dependencies

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
        handleFileSelected(file); // Use the existing file handler
      } else {
        setParseError('Please drop a valid JSON theme file.'); // Consider translating this
      }
    }
  }, [handleFileSelected]);

  // --- Conversion & Download ---
  const handleConvert = () => {
    if (!parsedTheme || isProcessing || isFetchingUrl) return; // Check both processing states
    setIsProcessing(true); // Use general processing for download generation
    try {
      setTimeout(() => { // Keep simulation
        try {
          const xml = generateXcodeTheme(parsedTheme);
          const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
          const filename = `${parsedTheme.name || 'theme'}.xccolortheme`;
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          setIsProcessing(false);
          setTimeout(() => {
            URL.revokeObjectURL(link.href);
            document.body.removeChild(link);
          }, 100);
        } catch (error) {
          console.error("Conversion error:", error);
          setParseError('Failed to generate Xcode theme.');
          setIsProcessing(false);
        }
      }, 300);
    } catch (error) {
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
    });
  };

  // --- Render Helper Components ---
  const InfoCard = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <div className="bg-gray-900/30 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center mb-3">
        <Icon className="w-6 h-6 mr-3 text-white flex-shrink-0" />
        <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
      </div>
      <div className="text-sm text-gray-300 space-y-2">
        {children}
      </div>
    </div>
  );

  // 添加渐变文本处理函数
  const renderThemeColorText = (text: string) => {
    const parts = text.split(/(<themecolor>.*?<\/themecolor>)/);
    return parts.map((part, index) => {
      const themeColorMatch = part.match(/<themecolor>(.*?)<\/themecolor>/);
      if (themeColorMatch) {
        return (
          <span 
            key={index} 
            className={`${currentTheme.tint}`}
          >
            {themeColorMatch[1]}
          </span>
        );
      }
      return part;
    });
  };

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


  // Determine if the main action button should be disabled
  const isActionButtonDisabled = !parsedTheme || isProcessing || isFetchingUrl;
  // Determine if inputs should be disabled
  const isInputDisabled = isProcessing || isFetchingUrl;

  return (
    // Apply dynamic background gradient class
    <div className={`min-h-screen dark bg-gradient-to-br ${currentTheme.background} text-gray-100 transition-colors duration-300 font-sans`}>
      {/* Header with Controls */}
      <header className="sticky top-0 z-30 w-full bg-gray-800/50 backdrop-blur-md border-b border-gray-700/50 shadow-sm">
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
          {/* Apply dynamic subtitle gradient class */}
          <h2 className={`text-lg md:text-xl lg:text-2xl text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.subtitle} mb-4`}>
            {t('appSubtitle')}
          </h2>
          <p className="text-md md:text-lg text-gray-400 font-medium">
            {t('appSlogan')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left/Top: Input Area */}
          <div className="lg:col-span-2 bg-gray-900/30 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 space-y-8">

            {/* URL Input Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">{t('fetchFromUrlTitle')}</h3>
              <div className="flex items-center space-x-3">
                <div className="relative flex-grow">
                  <FiLink className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isValidThemeUrl ? 'text-green-400' : 'text-gray-400'}`} />
                  <input
                    id="url-input"
                    type="url"
                    value={themeUrl}
                    onChange={handleThemeUrlChange}
                    placeholder={t('urlInputPlaceholder')}
                    disabled={isInputDisabled}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-800/60 border ${isValidThemeUrl ? 'border-green-500' : 'border-gray-600'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-100 placeholder-gray-500 transition-colors ${isInputDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <button
                  onClick={handleFetchFromUrl}
                  disabled={!themeUrl || !isValidThemeUrl || isInputDisabled || urlFetchSuccess}
                  className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2
                    ${!themeUrl || !isValidThemeUrl || isInputDisabled || urlFetchSuccess
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed shadow-inner'
                      : 'bg-green-700/70 hover:bg-green-600/70 text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900'}`
                  }
                >
                  {isFetchingUrl ? (
                    <FiLoader className="w-5 h-5 animate-spin"/>
                  ) : urlFetchSuccess ? (
                    <FiCheck className="w-5 h-5 text-green-400"/>
                  ) : (
                    <FiGlobe className="w-5 h-5"/>
                  )}
                  
                  {isFetchingUrl 
                    ? <span>{t('fetchingButton')}</span>
                    : urlFetchSuccess 
                    ? ''
                    : <span>{t('fetchButton')}</span>
                  }
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center text-center">
              <hr className="flex-grow border-t border-gray-600"/>
              <span className="px-4 text-sm text-gray-400">{t('or')}</span>
              <hr className="flex-grow border-t border-gray-600"/>
            </div>

            {/* File Uploader Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">{t('uploadAreaTitle')}</h3>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
                  ${isDragging ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600 hover:border-gray-500'}
                  ${selectedFile && !parseError ? 'border-green-500 bg-green-900/30' : ''}
                  ${parseError && !selectedFile ? 'border-red-500 bg-red-900/30' : ''} /* Only show red border if error is relevant to upload */
                  ${isInputDisabled ? 'opacity-60' : ''}`
                }
              >
                <input
                  type="file"
                  accept=".json,.jsonc"
                  onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="file-upload"
                  disabled={isInputDisabled}
                />
                <label htmlFor="file-upload" className={`cursor-pointer ${isInputDisabled ? 'cursor-wait' : ''}`}>
                  {isProcessing && selectedFile ? ( // Show loader only if processing a file
                    <FiLoader className="mx-auto h-12 w-12 mb-4 text-gray-400 animate-spin" />
                  ) : (
                    <FiUploadCloud className={`mx-auto h-12 w-12 mb-4 transition-colors duration-300
                      ${selectedFile && !parseError ? 'text-green-400' : 'text-gray-500'}
                      ${parseError && !selectedFile ? 'text-red-400' : ''}`} />
                  )}
                  <p className="text-sm text-gray-400 mb-4">{t('uploadAreaDescription')}</p>
                  <span className={`inline-block px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300
                    ${selectedFile && !parseError ? 'bg-green-900/50 text-green-300' : 'bg-gray-800/60 hover:bg-gray-600 text-gray-200'}
                    ${parseError && !selectedFile ? 'bg-red-900/50 text-red-300' : ''}
                    ${isInputDisabled ? 'opacity-50' : ''}`
                  }>
                    {selectedFile ? t('fileSelected') : t('uploadAreaButton')}
                  </span>
                  {selectedFile && <p className="mt-3 text-xs font-mono text-gray-400 break-all">{selectedFile.name}</p>}
                </label>
              </div>
            </div>

            {/* Parse Error Display */}
            {parseError && (
              <div className="mt-6 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
                {parseError}
              </div>
            )}

            {/* Convert Button */}
            <div className="mt-8 text-center">
              <button
                onClick={handleConvert}
                disabled={isActionButtonDisabled}
                className={`px-20 py-4 rounded-lg text-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 w-full sm:w-auto sm:inline-flex
                  ${!isActionButtonDisabled
                    ? 'bg-green-700 hover:bg-green-500 text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900'
                    : 'bg-gray-700/40 text-gray-400 cursor-not-allowed shadow-inner'}`
                }
              >
                {/* Show loader if processing download, otherwise icon */}
                {isProcessing && !isFetchingUrl ? <FiLoader className="w-5 h-5 animate-spin"/> : <FiDownloadCloud className="w-5 h-5"/>}
                <span>{isProcessing && !isFetchingUrl ? t('processingButton') : t('convertAndDownload')}</span>
              </button>
            </div>

            {/* Parsed Theme Info */}
            {parsedTheme && !isInputDisabled && ( // Show only when not busy
              <div className="mt-8 p-6 rounded-xl bg-gray-700/30">
                <h4 className="font-bold mb-3 text-gray-100">{t('themeInfoTitle')}</h4>
                <ThemeInfoDisplay theme={parsedTheme} />
              </div>
            )}
          </div>

          {/* Right/Bottom: Instructions & Disclaimer */}
          <div className="lg:col-span-1 space-y-8">
            <InfoCard icon={FiStar} title={t('instructionsTitle')}>
              <ol className="list-decimal list-inside space-y-2">
                <li>{t('instructionsStep1')}</li>
                <li>
                  {renderThemeColorText(t('instructionsStep2'))}
                  <div className="mt-2 flex items-center space-x-2 bg-gray-900/40 p-2 rounded-md">
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

            <InfoCard icon={FiInfo} title={t('disclaimerTitle')}>
              <p>{t('disclaimerText')}</p>
            </InfoCard>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-white select-none pb-4">
        Made with <span className="text-pink-400">♥</span> by <a className="underline" target="_blank" href='https://github.com/onevcat'>@onevcat</a>
      </footer>
    </div>
  );
}

export default App;
