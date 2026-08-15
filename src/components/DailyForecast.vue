<script setup lang="ts">
import type { DailyWeather, WeatherForecast } from '../types/weather'
import {
  formatDay,
  formatHour,
  formatMeasurement,
  formatPercent,
  formatShortDate,
  formatTemperature,
  formatTemperatureValue,
} from '../utils/formatters'
import { getWeatherDescription } from '../utils/weather'
import WeatherIcon from './WeatherIcon.vue'

const props = defineProps<{
  forecast: WeatherForecast
}>()

function accessibleTemperature(value: number | null, context: string) {
  if (value !== null) return `${context} ${formatTemperature(value, props.forecast.unit)}`
  const unit = props.forecast.unit === 'celsius' ? 'graus Celsius' : 'graus Fahrenheit'
  return `${context} indisponível em ${unit}`
}

function accessibleName(day: DailyWeather, index: number) {
  const sunrise = day.sunrise ? formatHour(day.sunrise) : 'indisponível'
  const sunset = day.sunset ? formatHour(day.sunset) : 'indisponível'
  return `${formatDay(day.date, index)}, ${formatShortDate(day.date)}; condição: ${getWeatherDescription(day.weatherCode, true).label}; ${accessibleTemperature(day.temperatureMin, 'mínima')}; ${accessibleTemperature(day.temperatureMax, 'máxima')}; chance máxima de chuva: ${formatPercent(day.precipitationProbability)}; nascer do sol: ${sunrise}; pôr do sol: ${sunset}; vento máximo: ${formatMeasurement(day.windSpeedMax, props.forecast.units.windSpeed)}.`
}
</script>

<template>
  <section class="daily-section" aria-labelledby="daily-title">
    <div class="section-heading">
      <div>
        <p class="section-kicker">Um pouco mais longe</p>
        <h2 id="daily-title">Os próximos 7 dias</h2>
      </div>
      <p>Temperaturas, chuva, luz do dia e vento em uma só leitura.</p>
    </div>

    <ol v-if="props.forecast.daily.length" class="daily-list">
      <li v-for="(day, index) in props.forecast.daily" :key="day.date" class="daily-row" :aria-label="accessibleName(day, index)">
        <div class="daily-row__date">
          <strong>{{ formatDay(day.date, index) }}</strong>
          <time :datetime="day.date">{{ formatShortDate(day.date) }}</time>
        </div>

        <div class="daily-row__condition">
          <WeatherIcon :code="day.weatherCode" :is-day="true" size="small" />
          <span>{{ getWeatherDescription(day.weatherCode, true).label }}</span>
        </div>

        <div class="daily-row__temperature" aria-label="Temperaturas mínima e máxima">
          <span>{{ formatTemperatureValue(day.temperatureMin) }}</span>
          <strong>{{ formatTemperatureValue(day.temperatureMax) }}</strong>
        </div>

        <div class="daily-row__rain" :aria-label="`Probabilidade máxima de chuva: ${formatPercent(day.precipitationProbability)}`">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M8 1.5S4.5 6 4.5 9a3.5 3.5 0 0 0 7 0C11.5 6 8 1.5 8 1.5Z" />
          </svg>
          <span>{{ formatPercent(day.precipitationProbability) }}</span>
        </div>

        <div class="daily-row__sun" aria-label="Horários de nascer e pôr do sol">
          <span><span aria-hidden="true">↗</span> {{ day.sunrise ? formatHour(day.sunrise) : '—' }}</span>
          <span><span aria-hidden="true">↘</span> {{ day.sunset ? formatHour(day.sunset) : '—' }}</span>
        </div>

        <div class="daily-row__wind" :aria-label="`Vento máximo: ${formatMeasurement(day.windSpeedMax, props.forecast.units.windSpeed)}`">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path d="M2 7h10a2.5 2.5 0 1 0-2.5-2.5M2 11h14a2.5 2.5 0 1 1-2.5 2.5M2 15h6" />
          </svg>
          <span>{{ formatMeasurement(day.windSpeedMax, props.forecast.units.windSpeed) }}</span>
        </div>
      </li>
    </ol>

    <div v-else class="section-empty" role="status">
      <strong>A previsão diária não está disponível.</strong>
      <span>Tente atualizar para solicitar uma nova leitura.</span>
    </div>
  </section>
</template>
