export type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'app_theme';

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }
  localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const getTheme = (): Theme => {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  return saved || 'dark';
};

export const initTheme = () => {
  const theme = getTheme();
  applyTheme(theme);
};

