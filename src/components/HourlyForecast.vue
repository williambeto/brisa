<script setup lang="ts">
import type { HourlyWeather, WeatherForecast } from '../types/weather'
import { formatHour, formatPercent, formatTemperature, formatTemperatureValue } from '../utils/formatters'
import { getWeatherDescription } from '../utils/weather'
import WeatherIcon from './WeatherIcon.vue'

const props = defineProps<{
  forecast: WeatherForecast
}>()

function accessibleName(hour: HourlyWeather, index: number) {
  const context = index === 0 ? 'Agora' : `Horário ${formatHour(hour.time)}`
  const time = formatHour(hour.time)
  const temperature = hour.temperature === null
    ? `temperatura indisponível em ${props.forecast.unit === 'celsius' ? 'graus Celsius' : 'graus Fahrenheit'}`
    : `temperatura ${formatTemperature(hour.temperature, props.forecast.unit)}`
  return `${context}, ${time}; condição: ${getWeatherDescription(hour.weatherCode, hour.isDay ?? true).label}; ${temperature}; chance de chuva: ${formatPercent(hour.precipitationProbability)}.`
}
</script>

<template>
  <section class="hourly-section" aria-labelledby="hourly-title">
    <div class="section-heading">
      <div>
        <p class="section-kicker">Daqui em diante</p>
        <h2 id="hourly-title">Próximas 24 horas</h2>
      </div>
      <p>Deslize para acompanhar a mudança do céu.</p>
    </div>

    <div v-if="props.forecast.hourly.length" class="hourly-scroll" tabindex="0" aria-label="Previsão horária, rolável horizontalmente">
      <ol class="hourly-list">
        <li v-for="(hour, index) in props.forecast.hourly" :key="hour.time" class="hourly-item" :aria-label="accessibleName(hour, index)">
          <time :datetime="hour.time">{{ index === 0 ? 'Agora' : formatHour(hour.time) }}</time>
          <WeatherIcon :code="hour.weatherCode" :is-day="hour.isDay" size="small" />
          <strong>{{ formatTemperatureValue(hour.temperature) }}</strong>
          <span class="hourly-item__rain" :aria-label="`Chance de chuva: ${formatPercent(hour.precipitationProbability)}`">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M8 1.5S4.5 6 4.5 9a3.5 3.5 0 0 0 7 0C11.5 6 8 1.5 8 1.5Z" />
            </svg>
            {{ formatPercent(hour.precipitationProbability) }}
          </span>
          <span class="sr-only">{{ getWeatherDescription(hour.weatherCode, hour.isDay ?? true).label }}</span>
        </li>
      </ol>
    </div>

    <div v-else class="section-empty" role="status">
      <strong>A previsão por hora não veio nesta leitura.</strong>
      <span>A previsão diária continua disponível abaixo.</span>
    </div>
  </section>
</template>
