<script setup lang="ts">
import type { WeatherForecast } from '../types/weather'
import { formatMeasurement, formatPercent, formatTemperature } from '../utils/formatters'

const props = defineProps<{
  forecast: WeatherForecast
}>()
</script>

<template>
  <section class="metrics-section" aria-labelledby="metrics-title">
    <div class="section-heading">
      <div>
        <p class="section-kicker">Leitura do momento</p>
        <h2 id="metrics-title">Agora, em detalhes</h2>
      </div>
      <p>Valores observados no horário local da cidade.</p>
    </div>

    <dl class="metrics-list">
      <div class="metric">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M9 14.8V5a3 3 0 0 1 6 0v9.8a5 5 0 1 1-6 0Z" />
          <path d="M12 8v8" />
        </svg>
        <dt>Sensação</dt>
        <dd>{{ formatTemperature(props.forecast.current.apparentTemperature, props.forecast.unit) }}</dd>
      </div>
      <div class="metric">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M12 3S6.5 9.5 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.5 12 3 12 3Z" />
        </svg>
        <dt>Umidade</dt>
        <dd>{{ formatPercent(props.forecast.current.humidity) }}</dd>
      </div>
      <div class="metric">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M8 4S4.5 8.5 4.5 11.5a3.5 3.5 0 0 0 7 0C11.5 8.5 8 4 8 4ZM16.5 11s-3 3.8-3 6.2a3 3 0 0 0 6 0c0-2.4-3-6.2-3-6.2Z" />
        </svg>
        <dt>Chuva agora</dt>
        <dd>{{ formatMeasurement(props.forecast.current.precipitation, props.forecast.units.precipitation) }}</dd>
      </div>
      <div class="metric">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7" />
        </svg>
        <dt>Vento</dt>
        <dd>{{ formatMeasurement(props.forecast.current.windSpeed, props.forecast.units.windSpeed) }}</dd>
      </div>
    </dl>
  </section>
</template>
