<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';

interface Props {
  content: string;
  label?: string;
  storageKey?: string;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  defaultHeight: 192,
  minHeight: 80,
  maxHeight: 640,
});

const height = ref(props.defaultHeight);
const isResizing = ref(false);
const showFullscreen = ref(false);
const fullscreenRef = ref<HTMLElement | null>(null);
const resizeStartY = ref(0);
const resizeStartHeight = ref(0);

const loadSavedHeight = () => {
  if (!props.storageKey) return;
  const saved = localStorage.getItem(props.storageKey);
  if (!saved) return;
  const parsed = Number.parseInt(saved, 10);
  if (!Number.isNaN(parsed)) {
    height.value = clampHeight(parsed);
  }
};

const saveHeight = () => {
  if (!props.storageKey) return;
  localStorage.setItem(props.storageKey, String(height.value));
};

const clampHeight = (value: number) =>
  Math.max(props.minHeight, Math.min(props.maxHeight, value));

const startResize = (event: MouseEvent) => {
  isResizing.value = true;
  resizeStartY.value = event.clientY;
  resizeStartHeight.value = height.value;
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
  event.preventDefault();
};

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value) return;
  const delta = event.clientY - resizeStartY.value;
  height.value = clampHeight(resizeStartHeight.value + delta);
};

const stopResize = () => {
  if (!isResizing.value) return;
  isResizing.value = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  saveHeight();
};

const openFullscreen = () => {
  showFullscreen.value = true;
};

const closeFullscreen = () => {
  showFullscreen.value = false;
};

const handleFullscreenKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeFullscreen();
  }
};

watch(showFullscreen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : '';
  if (isOpen) {
    requestAnimationFrame(() => fullscreenRef.value?.focus());
  }
});

onMounted(() => {
  loadSavedHeight();
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  document.body.style.overflow = '';
});
</script>

<template>
  <div class="resizable-code-preview">
    <div v-if="label" class="flex items-center justify-between gap-2 mb-1.5">
      <div class="text-[11px] font-medium text-text-muted">{{ label }}</div>
      <button
        type="button"
        class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-hover rounded transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-blue/50"
        aria-label="View full content"
        title="View full content"
        @click="openFullscreen"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
        Full screen
      </button>
    </div>

    <div class="relative rounded-md border border-border-subtle bg-bg-tertiary overflow-hidden">
      <pre
        class="p-2.5 text-xs font-mono text-text-secondary overflow-x-auto overflow-y-auto"
        :style="{ height: `${height}px` }"
      >{{ content }}</pre>

      <button
        type="button"
        class="code-resize-handle group"
        :class="{ 'is-dragging': isResizing }"
        aria-label="Drag to resize height"
        title="Drag to resize height"
        @mousedown="startResize"
      >
        <div class="code-resize-handle-line">
          <div class="code-resize-handle-dots">
            <span class="code-resize-dot" />
            <span class="code-resize-dot" />
            <span class="code-resize-dot" />
          </div>
        </div>
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="showFullscreen"
        ref="fullscreenRef"
        tabindex="-1"
        class="fixed inset-0 z-[120] flex flex-col bg-bg-primary outline-none"
        role="dialog"
        aria-modal="true"
        :aria-label="label || 'Code preview'"
        @keydown="handleFullscreenKeydown"
      >
        <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-border-default shrink-0">
          <div class="min-w-0">
            <h3 class="text-sm font-medium text-text-primary truncate">
              {{ label || 'Code Preview' }}
            </h3>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-blue/50"
            aria-label="Close full screen"
            @click="closeFullscreen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
            Exit full screen
          </button>
        </div>

        <div class="flex-1 min-h-0 overflow-auto p-4">
          <pre class="p-4 bg-bg-tertiary border border-border-subtle rounded-md text-sm font-mono text-text-secondary whitespace-pre-wrap break-words">{{ content }}</pre>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.code-resize-handle {
  width: 100%;
  height: 8px;
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  transition: background 0.2s ease;
}

.code-resize-handle:hover,
.code-resize-handle.is-dragging {
  background: rgba(59, 130, 246, 0.1);
}

.code-resize-handle-line {
  width: 60px;
  height: 3px;
  background: rgba(148, 163, 184, 0.4);
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.code-resize-handle:hover .code-resize-handle-line,
.code-resize-handle.is-dragging .code-resize-handle-line {
  background: rgba(59, 130, 246, 0.6);
  width: 80px;
}

.code-resize-handle-dots {
  display: flex;
  gap: 3px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.code-resize-handle:hover .code-resize-handle-dots,
.code-resize-handle.is-dragging .code-resize-handle-dots {
  opacity: 1;
}

.code-resize-dot {
  width: 3px;
  height: 3px;
  background: rgba(59, 130, 246, 0.8);
  border-radius: 50%;
}
</style>
