<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CitySearch from './components/CitySearch.vue'
import CurrentMetrics from './components/CurrentMetrics.vue'
import DailyForecast from './components/DailyForecast.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import HourlyForecast from './components/HourlyForecast.vue'
import UnitToggle from './components/UnitToggle.vue'
import WeatherIcon from './components/WeatherIcon.vue'
import WeatherSkeleton from './components/WeatherSkeleton.vue'
import { fetchWeather, OpenMeteoRequestError } from './services/openMeteo'
import type { TemperatureUnit, WeatherForecast, WeatherLocation } from './types/weather'
import {
  formatLocationContext,
  formatTemperature,
  formatUpdatedAt,
} from './utils/formatters'
import { DEFAULT_LOCATION, readStoredLocation, saveStoredLocation } from './utils/storage'
import { getWeatherDescription } from './utils/weather'

type ViewStatus = 'initializing' | 'loading' | 'refreshing' | 'success' | 'error'

const location = ref<WeatherLocation | null>(null)
const requestedLocation = ref<WeatherLocation | null>(null)
const forecast = ref<WeatherForecast | null>(null)
const status = ref<ViewStatus>('initializing')
const confirmedUnit = ref<TemperatureUnit>('celsius')
const requestedUnit = ref<TemperatureUnit>('celsius')
const inFlightUnit = ref<TemperatureUnit | null>(null)
const failedIntent = ref<{ location: WeatherLocation; unit: TemperatureUnit } | null>(null)
const recoveryKey = ref(0)
const errorMessage = ref('')

let weatherController: AbortController | null = null
let requestToken = 0
let mounted = false

const currentDescription = computed(() =>
  getWeatherDescription(
    forecast.value?.current.weatherCode,
    forecast.value?.current.isDay ?? true,
  ),
)

const atmosphere = computed(() => currentDescription.value.category)
const period = computed(() => (forecast.value?.current.isDay === false ? 'night' : 'day'))
const isBusy = computed(() => ['initializing', 'loading', 'refreshing'].includes(status.value))
const locationContext = computed(() =>
  location.value ? formatLocationContext(location.value) : 'Localização sendo preparada',
)

const statusMessage = computed(() => {
  const hasPendingIntent = ['loading', 'refreshing', 'error'].includes(status.value)
  const city = (hasPendingIntent ? requestedLocation.value : location.value)?.name ?? 'sua cidade'
  switch (status.value) {
    case 'initializing':
      return 'Inicializando a experiência meteorológica.'
    case 'loading':
      return `Buscando a previsão para ${city}.`
    case 'refreshing':
      return `Atualizando a previsão para ${city} em ${unitLabel(inFlightUnit.value)}.`
    case 'success':
      return `Previsão de ${city} carregada.`
    case 'error':
      return `Não foi possível atualizar a previsão de ${city} em ${unitLabel(failedIntent.value?.unit ?? requestedUnit.value)}.`
  }
})

onMounted(() => {
  mounted = true
  const initialLocation = readStoredLocation() ?? DEFAULT_LOCATION
  void requestForecast(initialLocation, requestedUnit.value)
})

onBeforeUnmount(() => {
  mounted = false
  requestToken += 1
  weatherController?.abort()
  weatherController = null
})

async function requestForecast(target: WeatherLocation, nextUnit: TemperatureUnit, force = false) {
  requestedLocation.value = target
  requestedUnit.value = nextUnit

  if (
    forecast.value &&
    location.value &&
    isSameLocation(location.value, target) &&
    confirmedUnit.value === nextUnit &&
    !force
  ) {
    requestToken += 1
    weatherController?.abort()
    weatherController = null
    inFlightUnit.value = null
    failedIntent.value = null
    errorMessage.value = ''
    status.value = 'success'
    return
  }

  weatherController?.abort()
  const requestController = new AbortController()
  const token = ++requestToken
  weatherController = requestController

  const canPreserveForecast = Boolean(
    forecast.value && location.value && isSameLocation(location.value, target),
  )

  errorMessage.value = ''
  failedIntent.value = null
  inFlightUnit.value = nextUnit
  status.value = canPreserveForecast ? 'refreshing' : 'loading'

  try {
    const nextForecast = await fetchWeather(target, nextUnit, requestController.signal)
    if (!isWinningRequest(token, requestController)) return

    forecast.value = nextForecast
    location.value = target
    confirmedUnit.value = nextUnit
    inFlightUnit.value = null
    failedIntent.value = null
    status.value = 'success'
    recoveryKey.value += 1
    saveStoredLocation(target)
  } catch (error) {
    if (!isWinningRequest(token, requestController)) return

    inFlightUnit.value = null
    failedIntent.value = { location: target, unit: nextUnit }
    status.value = 'error'
    errorMessage.value = getErrorMessage(error)
  } finally {
    if (isWinningRequest(token, requestController)) weatherController = null
  }
}

function selectLocation(nextLocation: WeatherLocation) {
  void requestForecast(nextLocation, requestedUnit.value)
}

function changeUnit(nextUnit: TemperatureUnit) {
  const target = requestedLocation.value ?? location.value
  if (!target || (nextUnit === requestedUnit.value && inFlightUnit.value === nextUnit)) return
  void requestForecast(target, nextUnit)
}

function retry() {
  if (isBusy.value) return
  const intent = failedIntent.value ?? (requestedLocation.value
    ? { location: requestedLocation.value, unit: requestedUnit.value }
    : location.value
      ? { location: location.value, unit: confirmedUnit.value }
      : null)
  if (intent) void requestForecast(intent.location, intent.unit, true)
}

function isWinningRequest(token: number, controller: AbortController) {
  return mounted && requestToken === token && weatherController === controller
}

function isSameLocation(first: WeatherLocation, second: WeatherLocation) {
  return first.latitude === second.latitude && first.longitude === second.longitude
}

function getErrorMessage(error: unknown) {
  if (error instanceof OpenMeteoRequestError && error.message) return error.message
  return 'Não conseguimos alcançar os dados meteorológicos. Verifique sua conexão e tente novamente.'
}

function unitLabel(value: TemperatureUnit | null) {
  return value === 'fahrenheit' ? 'graus Fahrenheit' : 'graus Celsius'
}
</script>

<template>
  <div class="app-shell" :data-weather="atmosphere" :data-period="period">
    <a class="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>

    <div class="atmosphere" aria-hidden="true">
      <span class="atmosphere__glow"></span>
      <span class="atmosphere__cloud atmosphere__cloud--one"></span>
      <span class="atmosphere__cloud atmosphere__cloud--two"></span>
      <span class="atmosphere__grain"></span>
    </div>

    <header class="site-header">
      <div class="site-header__inner">
        <div class="mini-brand" aria-label="Brisa, meteorologia cotidiana">
          <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
            <path d="M5 12h13a4 4 0 1 0-4-4M5 17h20a4 4 0 1 1-4 4M5 22h8" />
          </svg>
          <span>BRISA</span>
          <small>meteorologia cotidiana</small>
        </div>

        <UnitToggle
          :model-value="confirmedUnit"
          :disabled="!requestedLocation && !location"
          @change="changeUnit"
        />
      </div>
    </header>

    <main id="conteudo-principal">
      <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {{ statusMessage }}
      </p>

      <section class="hero" aria-labelledby="brand-title" :aria-busy="isBusy">
        <div class="hero__intro">
          <p class="hero__eyebrow">O tempo, no seu ritmo</p>
          <h1 id="brand-title">Brisa<span aria-hidden="true">.</span></h1>
          <p class="hero__lead">
            Uma leitura calma do céu para você decidir o que vem depois.
          </p>

          <CitySearch :location="requestedLocation ?? location" @select="selectLocation" />
        </div>

        <div v-if="forecast" class="hero__current">
          <div class="hero__location">
            <p>Agora em</p>
            <h2>{{ location?.name ?? 'Localização atual' }}</h2>
            <span>{{ locationContext }}</span>
          </div>

          <div class="hero__reading">
            <WeatherIcon
              :code="forecast.current.weatherCode"
              :is-day="forecast.current.isDay"
              size="hero"
            />
            <div>
              <strong class="hero__temperature">
                {{ formatTemperature(forecast.current.temperature, forecast.unit) }}
              </strong>
              <p class="hero__condition">{{ currentDescription.label }}</p>
              <p class="hero__feels">
                Sensação de
                {{ formatTemperature(forecast.current.apparentTemperature, forecast.unit) }}
              </p>
            </div>
          </div>

          <p v-if="status === 'refreshing'" class="refresh-label" role="status">
            Atualizando para {{ unitLabel(inFlightUnit) }}…
          </p>
        </div>

        <div v-else-if="status === 'initializing' || status === 'loading'" class="hero__state" role="status">
          <span class="hero-loader" aria-hidden="true"></span>
          <p class="hero__state-kicker">Consultando o horizonte</p>
          <h2>{{ requestedLocation ? `Preparando ${requestedLocation.name}` : 'Preparando sua primeira leitura' }}</h2>
          <p>Temperatura, chuva e vento estão a caminho.</p>
        </div>

        <div v-else class="hero__state hero__state--error" role="alert">
          <WeatherIcon :code="null" size="medium" />
          <p class="hero__state-kicker">O céu ficou fora de alcance</p>
          <h2>Não foi possível abrir esta previsão.</h2>
          <p>{{ errorMessage }}</p>
          <button class="primary-button" type="button" @click="retry">Tentar novamente</button>
        </div>
      </section>

      <aside v-if="status === 'error' && forecast" class="refresh-error" role="alert">
        <div>
          <strong>A atualização não foi concluída.</strong>
          <span>{{ errorMessage }} A leitura anterior continua visível.</span>
        </div>
        <button class="secondary-button" type="button" @click="retry">Tentar novamente</button>
      </aside>

      <div v-if="forecast" class="forecast-content">
        <ErrorBoundary :recovery-key="recoveryKey" :recovering="isBusy" @retry="retry">
          <CurrentMetrics :forecast="forecast" />
        </ErrorBoundary>
        <ErrorBoundary :recovery-key="recoveryKey" :recovering="isBusy" @retry="retry">
          <HourlyForecast :forecast="forecast" />
        </ErrorBoundary>
        <ErrorBoundary :recovery-key="recoveryKey" :recovering="isBusy" @retry="retry">
          <DailyForecast :forecast="forecast" />
        </ErrorBoundary>

        <section class="source-note" aria-labelledby="source-title">
          <div>
            <p class="section-kicker">Transparência da leitura</p>
            <h2 id="source-title">{{ formatUpdatedAt(forecast.updatedAt) }}</h2>
            <p>
              Horário local de {{ location?.name }}. Dados meteorológicos públicos da
              <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>,
              sem necessidade de chave de API.
            </p>
          </div>
          <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
            <circle cx="36" cy="36" r="28" />
            <path d="M20 39c6-8 12-8 18 0s12 8 18 0M20 29c6-8 12-8 18 0s12 8 18 0" />
          </svg>
        </section>
      </div>

      <WeatherSkeleton v-else-if="status === 'initializing' || status === 'loading'" />
    </main>

    <footer class="site-footer">
      <div>
        <strong>Brisa</strong>
        <span>Feita para consultar o tempo sem ruído.</span>
      </div>
      <p>
        Geocodificação e previsão por
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>.
      </p>
    </footer>
  </div>
</template>
