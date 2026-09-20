<script setup lang="ts">
import type { ThemePreference } from '../utils/storage'

defineProps<{
  modelValue: ThemePreference
}>()

const emit = defineEmits<{
  change: [theme: ThemePreference]
}>()
</script>

<template>
  <fieldset class="theme-toggle">
    <legend class="sr-only">Tema visual da interface</legend>
    <button
      class="theme-toggle__button"
      :class="{ 'theme-toggle__button--active': modelValue === 'light' }"
      type="button"
      :aria-pressed="modelValue === 'light'"
      title="Tema claro"
      aria-label="Tema claro"
      @click="emit('change', 'light')"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <span class="sr-only">Claro</span>
    </button>
    <button
      class="theme-toggle__button"
      :class="{ 'theme-toggle__button--active': modelValue === 'dark' }"
      type="button"
      :aria-pressed="modelValue === 'dark'"
      title="Tema escuro"
      aria-label="Tema escuro"
      @click="emit('change', 'dark')"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1Z" />
      </svg>
      <span class="sr-only">Escuro</span>
    </button>
    <button
      class="theme-toggle__button"
      :class="{ 'theme-toggle__button--active': modelValue === 'system' }"
      type="button"
      :aria-pressed="modelValue === 'system'"
      title="Automático pelo sistema"
      aria-label="Automático pelo sistema"
      @click="emit('change', 'system')"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
      <span class="sr-only">Sistema</span>
    </button>
  </fieldset>
</template>
