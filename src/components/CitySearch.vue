<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { searchLocations } from '../services/openMeteo'
import type { WeatherLocation } from '../types/weather'
import { formatLocationContext } from '../utils/formatters'

type SearchState = 'idle' | 'short' | 'loading' | 'success' | 'empty' | 'error'

const props = withDefaults(
  defineProps<{
    location?: WeatherLocation | null
    disabled?: boolean
  }>(),
  {
    location: null,
    disabled: false,
  },
)

const emit = defineEmits<{
  select: [location: WeatherLocation]
}>()

const query = ref('')
const suggestions = ref<WeatherLocation[]>([])
const state = ref<SearchState>('idle')
const isOpen = ref(false)
const activeIndex = ref(-1)
const input = ref<HTMLInputElement | null>(null)
const root = ref<HTMLElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | undefined
let searchController: AbortController | null = null

const id = useId()
const inputId = `${id}-input`
const hintId = `${id}-hint`
const listboxId = `${id}-listbox`
const feedbackId = `${id}-feedback`
const hasOptions = computed(
  () => isOpen.value && state.value === 'success' && suggestions.value.length > 0,
)
const activeDescendant = computed(() =>
  hasOptions.value && activeIndex.value >= 0 && activeIndex.value < suggestions.value.length
    ? optionId(activeIndex.value)
    : undefined,
)

const liveMessage = computed(() => {
  switch (state.value) {
    case 'short':
      return 'Digite pelo menos duas letras para pesquisar.'
    case 'loading':
      return 'Buscando cidades.'
    case 'success':
      return `${suggestions.value.length} ${suggestions.value.length === 1 ? 'cidade encontrada' : 'cidades encontradas'}. Use as setas para navegar.`
    case 'empty':
      return 'Nenhuma cidade encontrada. Confira a escrita e tente novamente.'
    case 'error':
      return 'A busca não respondeu. Verifique sua conexão e tente novamente.'
    default:
      return 'Pesquise uma cidade para ver a previsão.'
  }
})

watch(
  () => props.location,
  (location) => {
    if (location && !isOpen.value) query.value = location.name
  },
  { immediate: true },
)

watch(activeDescendant, async (option) => {
  if (!option) return
  await nextTick()
  const activeOption = document.getElementById(option)
  if (typeof activeOption?.scrollIntoView === 'function') {
    activeOption.scrollIntoView({ block: 'nearest' })
  }
})

function optionId(index: number) {
  return `${id}-option-${index}`
}

function handleInput() {
  cancelPendingSearch()
  suggestions.value = []
  activeIndex.value = -1

  const normalizedQuery = query.value.trim()
  if (!normalizedQuery) {
    state.value = 'idle'
    isOpen.value = false
    return
  }

  isOpen.value = true
  if (normalizedQuery.length < 2) {
    state.value = 'short'
    return
  }

  state.value = 'loading'
  debounceTimer = setTimeout(() => {
    debounceTimer = undefined
    void performSearch(normalizedQuery)
  }, 320)
}

async function performSearch(expectedQuery: string) {
  searchController?.abort()
  const requestController = new AbortController()
  searchController = requestController
  state.value = 'loading'
  isOpen.value = true

  try {
    const results = await searchLocations(expectedQuery, requestController.signal)
    if (searchController !== requestController || query.value.trim() !== expectedQuery) return

    suggestions.value = results
    activeIndex.value = -1
    isOpen.value = true
    state.value = results.length ? 'success' : 'empty'
  } catch {
    if (
      requestController.signal.aborted ||
      searchController !== requestController ||
      query.value.trim() !== expectedQuery
    ) {
      return
    }
    suggestions.value = []
    activeIndex.value = -1
    state.value = 'error'
  } finally {
    if (searchController === requestController) searchController = null
  }
}

function retrySearch() {
  const normalizedQuery = query.value.trim()
  if (normalizedQuery.length >= 2) {
    cancelPendingSearch()
    void performSearch(normalizedQuery)
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen.value = false
    activeIndex.value = -1
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (state.value === 'success' && suggestions.value.length) {
      isOpen.value = true
      activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
    }
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (state.value === 'success' && suggestions.value.length) {
      isOpen.value = true
      activeIndex.value =
        activeIndex.value <= 0 ? suggestions.value.length - 1 : activeIndex.value - 1
    }
    return
  }

  if (
    event.key === 'Enter' &&
    state.value === 'success' &&
    activeIndex.value >= 0 &&
    activeIndex.value < suggestions.value.length
  ) {
    event.preventDefault()
    selectLocation(suggestions.value[activeIndex.value])
  }
}

function handleSubmit() {
  if (state.value === 'success') {
    if (activeIndex.value >= 0 && activeIndex.value < suggestions.value.length) {
      selectLocation(suggestions.value[activeIndex.value])
    }
    return
  }

  const normalizedQuery = query.value.trim()
  if (normalizedQuery.length >= 2) {
    cancelPendingSearch()
    void performSearch(normalizedQuery)
  }
}

function selectLocation(location: WeatherLocation | undefined) {
  if (!location) return
  query.value = location.name
  suggestions.value = []
  state.value = 'idle'
  isOpen.value = false
  activeIndex.value = -1
  emit('select', location)
}

function clearSearch() {
  cancelPendingSearch()
  query.value = ''
  suggestions.value = []
  state.value = 'idle'
  isOpen.value = false
  activeIndex.value = -1
  input.value?.focus()
}

function handleFocus() {
  if (query.value.trim() && state.value !== 'idle') isOpen.value = true
}

function handleFocusout(event: FocusEvent) {
  const nextTarget = event.relatedTarget
  if (nextTarget instanceof Node && root.value?.contains(nextTarget)) return
  isOpen.value = false
  activeIndex.value = -1
}

function cancelPendingSearch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = undefined
  searchController?.abort()
  searchController = null
}

onBeforeUnmount(() => {
  cancelPendingSearch()
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement && root.value?.contains(activeElement)) activeElement.blur()
})
</script>

<template>
  <div ref="root" class="city-search" @focusout="handleFocusout">
    <form class="city-search__form" role="search" @submit.prevent="handleSubmit">
      <label class="sr-only" :for="inputId">Pesquisar cidade</label>
      <svg class="city-search__icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
      <input
        :id="inputId"
        ref="input"
        v-model="query"
        class="city-search__input"
        type="search"
        role="combobox"
        placeholder="Busque uma cidade"
        autocomplete="off"
        autocapitalize="words"
        spellcheck="false"
        :disabled="disabled"
        :aria-expanded="hasOptions"
        :aria-controls="hasOptions ? listboxId : undefined"
        :aria-activedescendant="activeDescendant"
        aria-autocomplete="list"
        :aria-describedby="`${hintId} ${feedbackId}`"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="handleFocus"
      />
      <button
        v-if="query"
        class="city-search__clear"
        type="button"
        aria-label="Limpar pesquisa"
        @mousedown.prevent
        @click="clearSearch"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="m7 7 10 10M17 7 7 17" />
        </svg>
      </button>
      <span v-if="state === 'loading'" class="city-search__spinner" aria-hidden="true"></span>
    </form>

    <p :id="hintId" class="city-search__hint">Cidade, estado ou país</p>
    <p :id="feedbackId" class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</p>

    <div
      v-if="hasOptions"
      class="city-search__popover"
      tabindex="0"
      aria-label="Resultados da busca"
    >
      <ul :id="listboxId" class="city-search__list" role="listbox">
        <li
          v-for="(suggestion, index) in suggestions"
          :id="optionId(index)"
          :key="suggestion.id ?? `${suggestion.latitude}-${suggestion.longitude}`"
          class="city-search__option"
          :class="{ 'city-search__option--active': activeIndex === index }"
          role="option"
          :aria-selected="activeIndex === index"
          @mouseenter="activeIndex = index"
          @pointerdown.prevent
          @click="selectLocation(suggestion)"
        >
          <span class="city-search__place">{{ suggestion.name }}</span>
          <span class="city-search__context">{{ formatLocationContext(suggestion) }}</span>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </li>
      </ul>
    </div>

    <div
      v-else-if="isOpen && state !== 'idle' && state !== 'success'"
      class="city-search__popover city-search__feedback"
      :aria-describedby="feedbackId"
    >
      <template v-if="state === 'short'">
        <strong>Continue escrevendo</strong>
        <span>Use pelo menos duas letras.</span>
      </template>
      <template v-else-if="state === 'loading'">
        <strong>Procurando no mapa…</strong>
        <span>Isso costuma levar só um instante.</span>
      </template>
      <template v-else-if="state === 'empty'">
        <strong>Nenhum lugar encontrado</strong>
        <span>Confira a escrita ou tente incluir o estado.</span>
      </template>
      <template v-else-if="state === 'error'">
        <strong>A busca ficou sem conexão</strong>
        <span>Tente novamente em alguns instantes.</span>
        <button class="text-button" type="button" @click="retrySearch">
          Tentar novamente
        </button>
      </template>
    </div>
  </div>
</template>
