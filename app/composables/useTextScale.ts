import {
  TEXT_SCALE_DEFAULT,
  TEXT_SCALE_PRESETS,
  applyTextScaleToDocument,
  clampTextScale,
  formatTextScalePercent,
  normalizeTextScale,
  persistTextScaleLocally,
  readStoredTextScale,
} from '~/utils/text-scale';

const TEXT_SCALE_QUERY_KEY = 'textScale';

export function useTextScale() {
  const scale = useState<number>('text-scale', () => TEXT_SCALE_DEFAULT);
  const isHydrated = useState<boolean>('text-scale-hydrated', () => false);
  const isSaving = ref(false);

  const scalePercent = computed(() => formatTextScalePercent(scale.value));

  const activePresetId = computed(() => {
    const match = TEXT_SCALE_PRESETS.find((preset) => preset.value === scale.value);
    return match?.id ?? 'custom';
  });

  const applyScale = (value: number, persist = true) => {
    const next = clampTextScale(value);
    scale.value = next;
    applyTextScaleToDocument(next);

    if (persist) {
      persistTextScaleLocally(next);
    }
  };

  const hydrateFromLocalStorage = () => {
    const stored = readStoredTextScale();
    if (stored !== null) {
      applyScale(stored, false);
    } else {
      applyScale(TEXT_SCALE_DEFAULT, false);
    }
    isHydrated.value = true;
  };

  const loadFromServer = async () => {
    try {
      const data = await $fetch<{ scale: number }>('/api/admin/settings', {
        query: { key: TEXT_SCALE_QUERY_KEY },
      });

      if (typeof data.scale === 'number') {
        applyScale(data.scale);
        return;
      }
    } catch {
      // Fall back to local preference when unauthenticated or offline.
    }

    hydrateFromLocalStorage();
  };

  const saveToServer = async (value = scale.value) => {
    isSaving.value = true;
    const next = clampTextScale(value);

    try {
      applyScale(next);
      await $fetch('/api/admin/settings', {
        method: 'POST',
        query: { key: TEXT_SCALE_QUERY_KEY },
        body: { scale: next },
      });
    } catch {
      applyScale(next);
    } finally {
      isSaving.value = false;
    }
  };

  const resetScale = async () => {
    await saveToServer(TEXT_SCALE_DEFAULT);
  };

  const setPreset = async (presetId: string) => {
    const preset = TEXT_SCALE_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    await saveToServer(preset.value);
  };

  const setScale = async (value: number) => {
    await saveToServer(normalizeTextScale(value));
  };

  return {
    scale,
    scalePercent,
    activePresetId,
    presets: TEXT_SCALE_PRESETS,
    isHydrated,
    isSaving,
    applyScale,
    hydrateFromLocalStorage,
    loadFromServer,
    saveToServer,
    resetScale,
    setPreset,
    setScale,
  };
}
