<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import type { SseEventMessage } from '~/composables/useSseClient';

const props = withDefaults(defineProps<{
  messages: SseEventMessage[];
  autoScroll?: boolean;
}>(), {
  autoScroll: true
});

const emit = defineEmits<{
  clear: [];
}>();

const logContainer = ref<HTMLElement | null>(null);
const autoScrollEnabled = ref(props.autoScroll);

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
}

function formatPayload(payload: string): string {
  try {
    const parsed = JSON.parse(payload);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return payload;
  }
}

function isJsonPayload(payload: string): boolean {
  try {
    JSON.parse(payload);
    return true;
  } catch {
    return false;
  }
}

function directionMeta(direction: SseEventMessage['direction']) {
  if (direction === 'received') {
    return { label: 'Event', badge: 'bg-method-sse/15 text-method-sse' };
  }
  return { label: 'System', badge: 'bg-method-ws/15 text-method-ws' };
}

async function scrollToBottom() {
  if (!autoScrollEnabled.value || !logContainer.value) return;
  await nextTick();
  logContainer.value.scrollTop = logContainer.value.scrollHeight;
}

watch(() => props.messages.length, () => {
  scrollToBottom();
});

onMounted(() => {
  scrollToBottom();
});
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-bg-secondary/40">
    <div class="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border-default bg-bg-secondary/80">
      <span class="text-xs font-medium text-text-muted">
        Events
        <span class="text-text-secondary font-mono tabular-nums">{{ messages.length }}</span>
      </span>
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none">
          <input
            v-model="autoScrollEnabled"
            type="checkbox"
            class="rounded border-border-default bg-bg-input text-accent-blue focus:ring-accent-blue focus:ring-offset-bg-secondary"
          >
          Auto-scroll
        </label>
        <button
          type="button"
          class="text-xs text-text-muted hover:text-text-primary px-2 py-1 rounded hover:bg-bg-hover transition-colors duration-fast disabled:opacity-40"
          :disabled="messages.length === 0"
          @click="emit('clear')"
        >
          Clear
        </button>
      </div>
    </div>

    <div
      ref="logContainer"
      class="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1.5"
    >
      <div
        v-if="messages.length === 0"
        class="flex flex-col items-center justify-center h-full min-h-[120px] px-6 text-center"
      >
        <p class="text-sm text-text-secondary">No events yet</p>
        <p class="text-xs text-text-muted mt-1 max-w-sm">
          Connect to the stream. Incoming server events appear here in real time.
        </p>
      </div>

      <article
        v-for="message in messages"
        :key="message.id"
        class="rounded-md border border-border-default bg-bg-input/60 overflow-hidden"
      >
        <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-border-default/60 bg-bg-tertiary/30">
          <span
            class="inline-flex items-center justify-center min-w-[52px] py-0.5 px-1.5 rounded text-[10px] font-semibold uppercase tracking-wide"
            :class="directionMeta(message.direction).badge"
          >
            {{ directionMeta(message.direction).label }}
          </span>
          <span
            v-if="message.event"
            class="text-[10px] text-text-muted font-mono truncate"
            :title="message.event"
          >
            {{ message.event }}
          </span>
          <span
            v-if="message.eventId"
            class="text-[10px] text-text-muted font-mono"
            :title="`id: ${message.eventId}`"
          >
            #{{ message.eventId }}
          </span>
          <span class="ml-auto text-[10px] text-text-muted font-mono tabular-nums">
            {{ formatTimestamp(message.timestamp) }}
          </span>
        </div>
        <pre
          class="px-2.5 py-2 text-xs font-mono text-text-primary whitespace-pre-wrap break-all leading-relaxed max-h-40 overflow-y-auto"
          :class="{ 'text-method-sse/90': isJsonPayload(message.payload) }"
        >{{ formatPayload(message.payload) }}</pre>
      </article>
    </div>
  </div>
</template>
