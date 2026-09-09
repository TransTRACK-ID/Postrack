export const TEXT_SCALE_STORAGE_KEY = 'postrack-text-scale';

export const TEXT_SCALE_MIN = 0.875;
export const TEXT_SCALE_MAX = 1.375;
export const TEXT_SCALE_STEP = 0.025;
export const TEXT_SCALE_DEFAULT = 1;

export interface TextScalePreset {
  id: string;
  label: string;
  description: string;
  value: number;
}

export const TEXT_SCALE_PRESETS: TextScalePreset[] = [
  { id: 'compact', label: 'Compact', description: 'Dense panels and long sessions', value: 0.875 },
  { id: 'default', label: 'Default', description: 'Postrack baseline', value: 1 },
  { id: 'comfortable', label: 'Comfortable', description: 'Easier body copy scanning', value: 1.125 },
  { id: 'large', label: 'Large', description: 'Reduced eye strain', value: 1.25 },
  { id: 'extra-large', label: 'Extra large', description: 'Maximum legibility', value: 1.375 },
];

export function clampTextScale(value: number): number {
  const rounded = Math.round(value / TEXT_SCALE_STEP) * TEXT_SCALE_STEP;
  return Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, rounded));
}

export function normalizeTextScale(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampTextScale(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return clampTextScale(parsed);
    }
  }

  return TEXT_SCALE_DEFAULT;
}

export function formatTextScalePercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function applyTextScaleToDocument(value: number): void {
  if (typeof document === 'undefined') {
    return;
  }

  const scale = clampTextScale(value);
  document.documentElement.style.setProperty('--text-scale', String(scale));
  document.documentElement.dataset.textScale = String(scale);
}

export function readStoredTextScale(): number | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(TEXT_SCALE_STORAGE_KEY);
  if (stored === null) {
    return null;
  }

  return normalizeTextScale(stored);
}

export function persistTextScaleLocally(value: number): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(TEXT_SCALE_STORAGE_KEY, String(clampTextScale(value)));
}
