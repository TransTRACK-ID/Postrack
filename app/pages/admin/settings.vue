<script setup lang="ts">
import MethodBadge from '~/components/MethodBadge.vue';
import { debounce } from 'perfect-debounce';
import {
  TEXT_SCALE_DEFAULT,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_STEP,
  applyTextScaleToDocument,
  clampTextScale,
} from '~/utils/text-scale';

definePageMeta({
  layout: 'admin',
  adminShell: {
    hideSidebar: true,
    backTo: '/admin',
    backLabel: 'Workspace',
  },
});

const {
  scale,
  scalePercent,
  activePresetId,
  presets,
  isSaving,
  setPreset,
  saveToServer,
  resetScale,
  loadFromServer,
} = useTextScale();

const draftScale = ref(scale.value);
const saveStatus = ref<'idle' | 'saved'>('idle');

watch(scale, (value) => {
  draftScale.value = value;
});

onMounted(async () => {
  await loadFromServer();
  draftScale.value = scale.value;
});

const previewLabel = computed(() => {
  const preset = presets.find((item) => item.id === activePresetId.value);
  return preset?.label ?? 'Custom';
});

const handleSliderInput = (event: Event) => {
  const value = clampTextScale(Number.parseFloat((event.target as HTMLInputElement).value));
  draftScale.value = value;
  applyTextScaleToDocument(value);
  queueSliderSave(value);
};

const queueSliderSave = debounce(async (value: number) => {
  await saveToServer(value);
  saveStatus.value = 'saved';
}, 250);

const handlePresetSelect = async (presetId: string) => {
  await setPreset(presetId);
  draftScale.value = scale.value;
  saveStatus.value = 'saved';
};

const handleReset = async () => {
  await resetScale();
  draftScale.value = scale.value;
  saveStatus.value = 'saved';
};

let saveStatusTimer: ReturnType<typeof setTimeout> | null = null;

watch(saveStatus, (value) => {
  if (saveStatusTimer) {
    clearTimeout(saveStatusTimer);
  }

  if (value === 'saved') {
    saveStatusTimer = setTimeout(() => {
      saveStatus.value = 'idle';
    }, 1800);
  }
});

onUnmounted(() => {
  if (saveStatusTimer) {
    clearTimeout(saveStatusTimer);
  }
});
</script>

<template>
  <div class="flex-1 min-h-0 overflow-y-auto">
    <div class="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <div class="mb-8">
        <p class="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">Settings</p>
        <h1 class="text-xl font-semibold text-text-primary mb-2">Accessibility</h1>
        <p class="text-sm text-text-secondary max-w-[65ch]">
          Adjust text size across the workspace. Changes apply immediately and sync to your account on this device.
        </p>
      </div>

      <section class="rounded-lg border border-border-default bg-bg-secondary overflow-hidden">
        <div class="flex items-start justify-between gap-4 border-b border-border-default px-5 py-4">
          <div>
            <h2 class="text-base font-semibold text-text-primary">Text size</h2>
            <p class="text-sm text-text-secondary mt-1">
              Current size: <span class="text-text-primary font-medium">{{ scalePercent }}</span>
              <span class="text-text-muted"> · {{ previewLabel }}</span>
            </p>
          </div>
          <span
            v-if="saveStatus === 'saved'"
            class="inline-flex items-center gap-1.5 rounded-md bg-accent-green/15 px-2.5 py-1 text-xs font-medium text-accent-green"
            aria-live="polite"
          >
            Saved
          </span>
          <span
            v-else-if="isSaving"
            class="inline-flex items-center gap-1.5 rounded-md bg-bg-tertiary px-2.5 py-1 text-xs font-medium text-text-muted"
          >
            Saving...
          </span>
        </div>

        <div class="px-5 py-5 space-y-6">
          <div>
            <div class="flex items-center justify-between mb-3">
              <label for="text-size-slider" class="text-xs font-medium text-text-secondary">
                Fine tune
              </label>
              <span class="text-sm font-mono text-text-primary">{{ Math.round(draftScale * 100) }}%</span>
            </div>
            <input
              id="text-size-slider"
              type="range"
              :min="TEXT_SCALE_MIN"
              :max="TEXT_SCALE_MAX"
              :step="TEXT_SCALE_STEP"
              :value="draftScale"
              class="w-full accent-accent-blue"
              aria-valuemin="87.5"
              aria-valuemax="137.5"
              :aria-valuenow="Math.round(draftScale * 100)"
              aria-label="Text size"
              @input="handleSliderInput"
            />
            <div class="mt-2 flex justify-between text-xs text-text-muted">
              <span>Compact</span>
              <span>Extra large</span>
            </div>
          </div>

          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-text-secondary mb-3">Presets</p>
            <div class="grid gap-2 sm:grid-cols-2">
              <button
                v-for="preset in presets"
                :key="preset.id"
                type="button"
                class="rounded-md border px-3 py-3 text-left transition-colors duration-fast"
                :class="activePresetId === preset.id
                  ? 'border-accent-blue bg-accent-blue/10'
                  : 'border-border-default bg-bg-tertiary hover:bg-bg-hover'"
                :aria-pressed="activePresetId === preset.id"
                @click="handlePresetSelect(preset.id)"
              >
                <span class="block text-sm font-medium text-text-primary">{{ preset.label }}</span>
                <span class="block text-xs text-text-muted mt-0.5">{{ preset.description }}</span>
                <span class="block text-xs font-mono text-text-secondary mt-1">{{ Math.round(preset.value * 100) }}%</span>
              </button>
            </div>
          </div>

          <div class="rounded-md border border-border-default bg-bg-primary p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-text-secondary mb-3">Preview</p>
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <MethodBadge method="GET" size="sm" />
                <span class="font-mono text-xs text-text-secondary">List workspace collections</span>
              </div>
              <p class="text-sm text-text-primary">
                Request names, labels, and panel copy scale together so the workbench stays readable at every size.
              </p>
              <label class="block text-xs font-medium uppercase tracking-wide text-text-secondary">
                Environment
              </label>
              <div class="rounded-md border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary">
                Production
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 pt-1">
            <p class="text-xs text-text-muted max-w-[42ch]">
              Default is {{ Math.round(TEXT_SCALE_DEFAULT * 100) }}%. Reset if the interface feels too large or too tight.
            </p>
            <button
              type="button"
              class="btn btn-secondary shrink-0"
              :disabled="isSaving || scale === TEXT_SCALE_DEFAULT"
              @click="handleReset"
            >
              Reset to default
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
