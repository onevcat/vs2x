// VSCode 主题解析器，将 VSCode 主题 JSON 解析为通用数据结构
// 参考官方 VSCode 主题格式：https://code.visualstudio.com/api/references/theme-color

export interface VscodeTheme {
  name: string;
  type: 'dark' | 'light' | string;
  colors: Record<string, string>;
  tokenColors: Array<any>;
  semanticHighlighting?: boolean;
  semanticTokenColors?: Record<string, any>;
}

export interface ParsedVscodeTheme {
  name: string;
  type: 'dark' | 'light' | string;
  colors: Record<string, string>;
  tokenColors: Array<any>;
  semanticHighlighting: boolean;
  semanticTokenColors: Record<string, any>;
}

/**
 * 解析 VSCode 主题 JSON 内容，返回标准结构
 * @param json VSCode 主题对象（已 parse）
 */
export function parseVscodeTheme(json: any): ParsedVscodeTheme {
  if (!json || typeof json !== 'object') {
    throw new Error('无效的 VSCode 主题文件：不是有效的 JSON 对象');
  }
  if (!json || !json.colors) {
    throw new Error('无效的 VSCode 主题文件：缺少 colors 字段');
  }
  return {
    name: json.name || 'Untitled Theme',
    type: json.type || 'dark',
    colors: json.colors || {},
    tokenColors: json.tokenColors || [],
    semanticHighlighting: json.semanticHighlighting === true,
    semanticTokenColors: json.semanticTokenColors || {},
  };
}
