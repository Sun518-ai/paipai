# TodoMVC Dark Mode — Technical Design

## 1. Overview

为 TodoMVC 页面实现深色模式，采用 **CSS 变量 + data 属性选择器** 方案，配合 React Context 管理主题状态，持久化到 localStorage。

## 2. Theme System Architecture

### 2.1 CSS Variables (globals.css)

```css
:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-gradient-start: #eef2ff;
  --bg-gradient-mid: #ffffff;
  --bg-gradient-end: #faf5ff;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-muted: #cbd5e1;
  --border: #e2e8f0;
  --accent: #6366f1;
  --accent-hover: #4f46e5;
  --danger: #ef4444;
}

[data-theme='dark'] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-gradient-start: #1e1b4b;
  --bg-gradient-mid: #1e293b;
  --bg-gradient-end: #2e1065;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #475569;
  --border: #334155;
  --accent: #818cf8;
  --accent-hover: #a5b4fc;
  --danger: #f87171;
}
```

### 2.2 Resolved Theme Logic

```
initial: read localStorage('paipai-todomcv-theme')
  ├─ null → use system preference (matchMedia)
  └─ 'light'|'dark' → use stored value
```

On toggle: store new value and update `document.documentElement.dataset.theme`.

### 2.3 Hydration Safety

Theme initialization happens inside `useEffect` (client-only) to avoid SSR/CSR mismatch.

```tsx
// Before hydration: default to light to avoid class mismatch
const [theme, setTheme] = useState<'light' | 'dark'>('light');
// After mount: correct value from localStorage/system
useEffect(() => {
  const stored = localStorage.getItem('paipai-todomcv-theme');
  if (stored === 'dark') { setTheme('dark'); applyTheme('dark'); }
  else if (stored === 'light') { setTheme('light'); applyTheme('light'); }
  else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = prefersDark ? 'dark' : 'light';
    setTheme(resolved);
    applyTheme(resolved);
  }
}, []);
```

## 3. Context API

```ts
interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
});

function useTheme() {
  return useContext(ThemeContext);
}
```

## 4. File Changes

### 4.1 `src/app/globals.css`
- Add CSS custom properties for light/dark color tokens
- Add `[data-theme='dark']` override block
- Add `transition` on background-color, color, border-color

### 4.2 `src/app/ideas/todomcv/page.tsx`
- Add `ThemeContext` definition (inline, near `LangContext`)
- Add `useTheme` hook
- Add `applyTheme()` helper (sets `document.documentElement.dataset.theme`)
- `useEffect` for initial theme resolution and system preference listener
- Toggle button (🌙/☀️) in header row alongside lang toggle
- Replace hardcoded color classes with CSS variable references OR add `dark:` Tailwind variants

## 5. Color Class Mapping

Since we use CSS variables on `:root` and `[data-theme='dark']`, we can keep existing Tailwind classes and just add `dark:` variants where needed. The CSS variable approach means most existing classes (like `bg-white`, `text-gray-900`) can be kept if we redefine what those map to via CSS variables, OR we add explicit `dark:` overrides.

**Strategy:** Add `dark:` variants for all affected elements. This is more explicit and maintainable than CSS variable remapping of all Tailwind utilities.

```tsx
// Before
<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">

// After (keep gradient via CSS variable approach or keep as-is)
// We keep gradient but override colors via CSS variables in globals.css
```

## 6. localStorage Schema

```json
// Key: "paipai-todomcv-theme"
// Value: "light" | "dark"
// No "system" value needed — system is the fallback behavior when key is absent
```

## 7. Dependencies

No new dependencies. All implementation uses:
- React (useState, useEffect, useContext, createContext) — already in use
- CSS custom properties — native CSS
- localStorage — already used in this app via `loadHybrid`/`saveHybrid`
- `window.matchMedia` — native browser API

## 8. Accessibility

- Theme toggle button has `aria-label` describing current action
- Sufficient color contrast maintained in both themes
- No flashing on page load (theme applied before first paint via CSS variables on `:root` with system-fallback)
