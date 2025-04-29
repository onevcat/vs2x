// Xcode 主题生成器：将 VSCode 主题解析结果转换为 .xccolortheme XML 字符串
import { ParsedVscodeTheme } from './vscodeThemeParser';

// Xcode 关键字段及默认值
const xcodeRequiredKeys: Record<string, string> = {
  DVTSourceTextBackground: '0.0584239 0.0584239 0.0584239 1',
  DVTSourceTextSelectionColor: '0.253963 0.279965 0.351202 1',
  DVTSourceTextCurrentLineHighlightColor: '0.107309 0.113809 0.131618 1',
  DVTSourceTextInsertionPointColor: '0.973 0.973 0.941 1',
  "xcode.syntax.plain": '0.973 0.973 0.941 1',
};

// VSCode → Xcode 字段基础映射
const colorMapping: Record<string, string> = {
  'editor.background': 'DVTSourceTextBackground',
  'editor.foreground': 'xcode.syntax.plain',
  'editor.selectionBackground': 'DVTSourceTextSelectionColor',
  'editor.lineHighlightBackground': 'DVTSourceTextCurrentLineHighlightColor',
  'editorCursor.foreground': 'DVTSourceTextInsertionPointColor',
};

// VSCode token → Xcode syntax token 映射
const tokenMapping: Record<string, string> = {
  'comment': 'xcode.syntax.comment',
  'string': 'xcode.syntax.string',
  'string.quoted': 'xcode.syntax.string',
  'string.quoted.double': 'xcode.syntax.string',
  'string.quoted.single': 'xcode.syntax.string',
  'constant.character': 'xcode.syntax.character',
  'string.character': 'xcode.syntax.character',
  'character': 'xcode.syntax.character',
  'keyword': 'xcode.syntax.keyword',
  'number': 'xcode.syntax.number',
  'variable': 'xcode.syntax.identifier.variable',
  'function': 'xcode.syntax.identifier.function',
  'type': 'xcode.syntax.identifier.type',
  'class': 'xcode.syntax.identifier.class',
  'constant': 'xcode.syntax.identifier.constant',
  'attribute': 'xcode.syntax.attribute',
};

// 颜色格式转换
function hexToXcodeColor(hex: string, fallback = '1 1 1 1'): string {
  if (!hex || typeof hex !== 'string') return fallback;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  if (h.length === 6) h += 'FF';
  if (h.length !== 8) return fallback;
  const r = Math.round(parseInt(h.slice(0, 2), 16) / 255 * 1000000) / 1000000;
  const g = Math.round(parseInt(h.slice(2, 4), 16) / 255 * 1000000) / 1000000;
  const b = Math.round(parseInt(h.slice(4, 6), 16) / 255 * 1000000) / 1000000;
  const a = Math.round(parseInt(h.slice(6, 8), 16) / 255 * 1000000) / 1000000;
  if ([r, g, b, a].some(x => isNaN(x) || x < 0 || x > 1)) return fallback;
  return `${r} ${g} ${b} ${a}`;
}

/**
 * 生成 Xcode 主题 XML 字符串
 * @param theme ParsedVscodeTheme
 */
export function generateXcodeTheme(theme: ParsedVscodeTheme): string {
  // 1. 颜色基础映射，先补全所有关键字段
  const xcodeColors: Record<string, string> = { ...xcodeRequiredKeys };
  for (const [vsKey, xcKey] of Object.entries(colorMapping)) {
    if (theme.colors[vsKey]) {
      xcodeColors[xcKey] = hexToXcodeColor(theme.colors[vsKey], xcodeColors[xcKey] || '1 1 1 1');
    }
  }
  // 2. token 映射（优先采用最通用 scope 的颜色）
  const syntaxColors: Record<string, string> = {};
  const scopePriority = [
    'string', 'string.quoted', 'string.quoted.double', 'string.quoted.single',
    'constant.character', 'string.character', 'character',
    'comment', 'keyword', 'number', 'variable', 'function', 'type', 'class', 'constant', 'attribute'
  ];
  if (Array.isArray(theme.tokenColors)) {
    for (const token of theme.tokenColors) {
      const scopes: string[] = Array.isArray(token.scope) ? token.scope : (typeof token.scope === 'string' ? [token.scope] : []);
      const settings = token.settings || {};
      for (const s of scopes) {
        const mapped = tokenMapping[s] || tokenMapping[s.split('.')?.[0]];
        if (mapped && settings.foreground) {
          if (!(mapped in syntaxColors)) {
            syntaxColors[mapped] = hexToXcodeColor(settings.foreground);
          } else {
            const prevScope = Object.keys(tokenMapping).find(key => tokenMapping[key] === mapped && syntaxColors[mapped] === hexToXcodeColor(settings.foreground));
            const prevIdx = prevScope ? scopePriority.indexOf(prevScope) : 999;
            const currIdx = scopePriority.indexOf(s);
            if (currIdx > -1 && (prevIdx === -1 || currIdx < prevIdx)) {
              syntaxColors[mapped] = hexToXcodeColor(settings.foreground);
            }
          }
        }
      }
    }
  }
  // 补全所有 xcode.syntax.* 关键 token，缺省用 plain 的色或默认色
  const syntaxRequired = [
    'xcode.syntax.plain', 'xcode.syntax.comment', 'xcode.syntax.string', 'xcode.syntax.keyword',
    'xcode.syntax.number', 'xcode.syntax.identifier.variable', 'xcode.syntax.identifier.constant',
  ];
  for (const k of syntaxRequired) {
    if (!syntaxColors[k]) {
      syntaxColors[k] = xcodeColors['xcode.syntax.plain'] || xcodeRequiredKeys['xcode.syntax.plain'];
    }
  }
  // 3. 合并生成 XML
  const plistItems: string[] = [];
  for (const [k, v] of Object.entries(xcodeColors)) {
    plistItems.push(`<key>${k}</key>\n<string>${v}</string>`);
  }
  plistItems.push(`<key>DVTSourceTextSyntaxColors</key>\n<dict>`);
  for (const [k, v] of Object.entries(syntaxColors)) {
    plistItems.push(`<key>${k}</key>\n<string>${v}</string>`);
  }
  plistItems.push(`</dict>`);
  if (theme.name) {
    plistItems.push(`<key>XCThemeName</key>\n<string>${theme.name}</string>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n${plistItems.join('\n')}\n</dict>\n</plist>\n`;
}