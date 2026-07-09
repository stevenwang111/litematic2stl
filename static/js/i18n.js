const LANG_KEY = 'litematica-lang'

const translations = {
  'zh-CN': {
    title: 'STL 文件预览',
    appTitle: 'STL 3D 预览',
    openStl: '打开 STL',
    uploadLitematic: '上传 Litematic',
    downloadStl: '下载 STL',
    resetView: '重置视角',
    clear: '清除',
    fileName: '文件名:',
    triangles: '三角面:',
    vertices: '顶点:',
    size: '尺寸:',
    volume: '体积:',
    placeholder: '拖入或点击上方按钮打开 STL 文件',
    colorLabel: '显示颜色:',
    swatchRed: '默认红',
    swatchCyan: '天蓝',
    swatchGreen: '草绿',
    swatchOrange: '橙',
    swatchPurple: '紫',
    swatchRed2: '红',
    swatchGray: '灰',
    swatchWhite: '白',
    dragHint: '拖拽旋转 / 滚轮缩放',
    themeDark: '☾ 深色',
    themeLight: '☀ 浅色',
    lightPoint: '◐ 点光',
    lightAmbient: '● 环境光',
    unknown: '未命名',
    errLitematic: 'Litematic 转换失败:\n',
    errNoModel: '请先加载一个模型',
    errStlParse: 'STL 文件解析失败:\n',
    errDropStl: '请拖入 .stl 文件',
    langSwitch: 'EN',
  },
  en: {
    title: 'STL File Viewer',
    appTitle: 'STL 3D Viewer',
    openStl: 'Open STL',
    uploadLitematic: 'Upload Litematic',
    downloadStl: 'Download STL',
    resetView: 'Reset View',
    clear: 'Clear',
    fileName: 'File:',
    triangles: 'Triangles:',
    vertices: 'Vertices:',
    size: 'Size:',
    volume: 'Volume:',
    placeholder: 'Drag & drop or click to open STL file',
    colorLabel: 'Color:',
    swatchRed: 'Default Red',
    swatchCyan: 'Cyan',
    swatchGreen: 'Green',
    swatchOrange: 'Orange',
    swatchPurple: 'Purple',
    swatchRed2: 'Red',
    swatchGray: 'Gray',
    swatchWhite: 'White',
    dragHint: 'Drag to rotate / Scroll to zoom',
    themeDark: '☾ Dark',
    themeLight: '☀ Light',
    lightPoint: '◐ Point Light',
    lightAmbient: '● Ambient Light',
    unknown: 'Unnamed',
    errLitematic: 'Litematic conversion failed:\n',
    errNoModel: 'Please load a model first',
    errStlParse: 'STL file parse failed:\n',
    errDropStl: 'Please drop a .stl file',
    langSwitch: '中',
  },
}

let currentLang = 'zh-CN'

export function getLang() {
  return currentLang
}

export function t(key) {
  return translations[currentLang]?.[key] ?? translations['zh-CN']?.[key] ?? key
}

export function setLang(lang) {
  if (lang !== 'zh-CN' && lang !== 'en') return
  currentLang = lang
  localStorage.setItem(LANG_KEY, lang)
  document.documentElement.lang = lang
  applyTranslations()
}

export function initI18n() {
  const saved = localStorage.getItem(LANG_KEY)
  const browser = navigator.language?.startsWith('zh') ? 'zh-CN' : 'en'
  currentLang = (saved === 'en' || saved === 'zh-CN') ? saved : browser
  document.documentElement.lang = currentLang
  applyTranslations()
  return currentLang
}

export function switchLang() {
  const newLang = currentLang === 'zh-CN' ? 'en' : 'zh-CN'
  setLang(newLang)
  return newLang
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n)
  })
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle)
  })
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder)
  })
}
