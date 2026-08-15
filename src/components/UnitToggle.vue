<script setup lang="ts">
import type { TemperatureUnit } from '../types/weather'

defineProps<{
  modelValue: TemperatureUnit
  disabled?: boolean
}>()

const emit = defineEmits<{
  change: [unit: TemperatureUnit]
}>()
</script>

<template>
  <fieldset class="unit-toggle" :disabled="disabled">
    <legend class="sr-only">Unidade de temperatura</legend>
    <button
      class="unit-toggle__button"
      :class="{ 'unit-toggle__button--active': modelValue === 'celsius' }"
      type="button"
      :aria-pressed="modelValue === 'celsius'"
      @click="emit('change', 'celsius')"
    >
      °C
    </button>
    <button
      class="unit-toggle__button"
      :class="{ 'unit-toggle__button--active': modelValue === 'fahrenheit' }"
      type="button"
      :aria-pressed="modelValue === 'fahrenheit'"
      @click="emit('change', 'fahrenheit')"
    >
      °F
    </button>
  </fieldset>
</template>
