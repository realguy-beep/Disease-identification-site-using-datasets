export type WallpaperType = 'gradient' | 'solid' | 'bundled' | 'custom' | 'animated';
export type WallpaperFit = 'fill' | 'fit' | 'stretch' | 'tile' | 'center';
export type ThemeMode = 'dark' | 'light' | 'auto';
export type ThemePack = 'custom' | 'midnight' | 'solarized' | 'high-contrast' | 'emerald-calm' | 'rose-quartz';
export type DockPosition = 'bottom' | 'top' | 'left' | 'right';
export type DockSize = 'sm' | 'md' | 'lg';
export type FontFamily = 'system' | 'inter' | 'mono' | 'serif';
export type IconPack = 'outline' | 'filled' | 'colorful';

export interface LoomSettings {
  id: string; // 'current_settings'
  themeMode: ThemeMode;
  themePack: ThemePack;
  wallpaperType: WallpaperType;
  wallpaper: string; // CSS gradient, solid hex, image URL, or Base64 data URI
  wallpaperFit: WallpaperFit;
  accentColor: string;
  windowCornerRadius: number; // px, 4 to 28
  windowBlur: number; // px, 0 to 30
  windowOpacity: number; // 0.5 to 1.0
  animSpeed: number; // ms, 100 to 500
  dockPosition: DockPosition;
  dockSize: DockSize;
  dockAutoHide: boolean;
  dockPinnedAppIds: string[];
  fontFamily: FontFamily;
  fontSize: 'sm' | 'md' | 'lg';
  iconPack: IconPack;
  language: string;
  reducedMotion: boolean;
  dnd: boolean;
  updatedAt: number;
}

export const DEFAULT_SETTINGS: LoomSettings = {
  id: 'current_settings',
  themeMode: 'dark',
  themePack: 'custom',
  wallpaperType: 'animated',
  wallpaper: 'radial-gradient(ellipse at 50% 20%, rgba(99, 102, 241, 0.15) 0%, rgba(14, 165, 233, 0.05) 50%, transparent 80%)',
  wallpaperFit: 'fill',
  accentColor: '#6366f1',
  windowCornerRadius: 16,
  windowBlur: 16,
  windowOpacity: 0.94,
  animSpeed: 200,
  dockPosition: 'bottom',
  dockSize: 'md',
  dockAutoHide: false,
  dockPinnedAppIds: ['loom.notes', 'loom.files', 'loom.terminal', 'loom.calculator', 'loom.timer', 'loom.settings'],
  fontFamily: 'system',
  fontSize: 'md',
  iconPack: 'colorful',
  language: 'en-US',
  reducedMotion: false,
  dnd: false,
  updatedAt: Date.now()
};

export const THEME_PACKS: Record<ThemePack, { name: string; accent: string; bg: string; surface: string; text: string }> = {
  custom: {
    name: 'Custom',
    accent: '#6366f1',
    bg: '#090a0f',
    surface: '#12141e',
    text: '#f3f4f6'
  },
  midnight: {
    name: 'Midnight Obsidian',
    accent: '#38bdf8',
    bg: '#040508',
    surface: '#0d1017',
    text: '#f8fafc'
  },
  solarized: {
    name: 'Solarized Dark',
    accent: '#268bd2',
    bg: '#002b36',
    surface: '#073642',
    text: '#93a1a1'
  },
  'high-contrast': {
    name: 'High Contrast',
    accent: '#ffff00',
    bg: '#000000',
    surface: '#111111',
    text: '#ffffff'
  },
  'emerald-calm': {
    name: 'Emerald Calm',
    accent: '#10b981',
    bg: '#06130e',
    surface: '#0d221a',
    text: '#ecfdf5'
  },
  'rose-quartz': {
    name: 'Rose Quartz',
    accent: '#f43f5e',
    bg: '#14080e',
    surface: '#24121b',
    text: '#fff1f2'
  }
};
