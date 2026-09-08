<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import SseEventLog from './SseEventLog.vue';
import { useSseClient } from '~/composables/useSseClient';
import type { SocketConfig } from '../../server/db/schema/savedRequest';

const props = defineProps<{
  url: string;
  headers?: Record<string, string>;
  socketConfig: SocketConfig;
  environmentId?: string;
  shareToken?: string;
  authQueryParams?: Record<string, string>;
  preScript?: string;
}>();

const emit = defineEmits<{
  socketConfigChange: [config: SocketConfig];
  connectionStateChange: [state: string];
}>();

const {
  connectionState,
  messages,
  lastError,
  connectTiming,
  resolvedUrl,
  isConnected,
  isConnecting,
  connect,
  disconnect,
  clearMessages
} = useSseClient();

const lastEventId = ref(props.socketConfig?.lastEventId || '');
const withCredentials = ref(Boolean(props.socketConfig?.withCredentials));

const showConfig = ref(
  Boolean(props.socketConfig?.lastEventId?.trim() || props.socketConfig?.withCredentials)
);

const localSocketConfig = computed<SocketConfig>(() => ({
  ...props.socketConfig,
  lastEventId: lastEventId.value || undefined,
  withCredentials: withCredentials.value
}));

watch(localSocketConfig, (config) => {
  emit('socketConfigChange', config);
}, { deep: true });

watch(connectionState, (state) => {
  emit('connectionStateChange', state);
});

watch(() => props.socketConfig, (config) => {
  if (!config) return;
  lastEventId.value = config.lastEventId || '';
  withCredentials.value = Boolean(config.withCredentials);
}, { deep: true });

const connectionStatusLabel = computed(() => {
  switch (connectionState.value) {
    case 'connected': return 'Connected';
    case 'connecting': return 'Connecting';
    case 'closing': return 'Closing';
    case 'error': return 'Error';
    case 'closed': return 'Disconnected';
    default: return 'Idle';
  }
});

const connectionStatusClass = computed(() => {
  switch (connectionState.value) {
    case 'connected': return 'bg-method-sse/15 text-method-sse';
    case 'connecting': return 'bg-method-post/15 text-method-post';
    case 'error': return 'bg-method-delete/15 text-method-delete';
    default: return 'bg-bg-tertiary text-text-muted';
  }
});

const canConnect = computed(() => Boolean(props.url?.trim()) && !isConnecting.value);
const usesHeaderProxy = computed(() => Boolean(props.headers && Object.keys(props.headers).length > 0));

const connectButtonLabel = computed(() => {
  if (isConnecting.value) return 'Connecting';
  if (isConnected.value) return 'Disconnect';
  return 'Connect';
});

const inputClass =
  'w-full min-h-[34px] py-1.5 px-2 bg-bg-input border border-border-default rounded-md text-text-primary text-[13px] font-mono leading-5 placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/60 transition-colors duration-fast';

async function handleConnectToggle() {
  if (isConnected.value || isConnecting.value) {
    await disconnect();
    return;
  }

  await connect({
    url: props.url,
    headers: props.headers,
    lastEventId: lastEventId.value,
    withCredentials: withCredentials.value,
    environmentId: props.environmentId,
    shareToken: props.shareToken,
    authQueryParams: props.authQueryParams,
    preScript: props.preScript
  });
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0 overflow-hidden">
    <div class="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border-default bg-bg-secondary/80">
      <span
        class="inline-flex items-center py-0.5 px-2 rounded text-[11px] font-semibold uppercase tracking-wide"
        :class="connectionStatusClass"
      >
        <span
          v-if="isConnecting"
          class="inline-block w-2 h-2 mr-1.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
        {{ connectionStatusLabel }}
      </span>

      <span
        v-if="connectTiming"
        class="text-[11px] text-text-muted font-mono tabular-nums"
      >
        {{ connectTiming.durationMs }}ms
      </span>

      <span
        v-if="resolvedUrl"
        class="text-[11px] text-text-muted font-mono truncate min-w-0 flex-1"
        :title="resolvedUrl"
      >
        {{ resolvedUrl }}
      </span>

      <span
        v-if="lastError"
        class="text-[11px] text-method-delete truncate max-w-[200px]"
        :title="lastError"
      >
        {{ lastError }}
      </span>

      <span
        v-if="usesHeaderProxy"
        class="text-[11px] text-text-muted"
        title="Custom headers are sent through the Postrack SSE proxy"
      >
        Proxy
      </span>

      <button
        type="button"
        class="ml-auto shrink-0 py-1.5 px-4 text-xs font-semibold rounded-md border transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        :class="isConnected || isConnecting
          ? 'bg-method-delete/10 text-method-delete border-method-delete/30 hover:bg-method-delete/20 focus:ring-method-delete/40'
          : 'bg-accent-blue text-white border-accent-blue hover:bg-[#1976D2] focus:ring-accent-blue/50'"
        :disabled="!canConnect && !isConnected && !isConnecting"
        @click="handleConnectToggle"
      >
        {{ connectButtonLabel }}
      </button>
    </div>

    <div class="shrink-0 border-b border-border-default bg-bg-secondary/50">
      <button
        type="button"
        class="w-full flex items-center justify-between px-3 py-2 text-xs text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors duration-fast"
        @click="showConfig = !showConfig"
      >
        <span>Connection options</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="transition-transform duration-fast"
          :class="{ 'rotate-180': showConfig }"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        v-show="showConfig"
        class="grid grid-cols-1 lg:grid-cols-2 gap-3 px-3 pb-3"
      >
        <div>
          <label class="block text-xs text-text-muted mb-1">Last-Event-ID</label>
          <input
            v-model="lastEventId"
            type="text"
            placeholder="Resume from event id"
            :class="inputClass"
          >
        </div>
        <div class="flex items-end">
          <label class="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none pb-2">
            <input
              v-model="withCredentials"
              type="checkbox"
              class="rounded border-border-default bg-bg-input text-accent-blue focus:ring-accent-blue focus:ring-offset-bg-secondary"
            >
            Send credentials (cookies)
          </label>
        </div>
      </div>
    </div>

    <div class="flex-1 min-h-0 overflow-hidden">
      <SseEventLog
        :messages="messages"
        @clear="clearMessages"
      />
    </div>
  </div>
</template>
