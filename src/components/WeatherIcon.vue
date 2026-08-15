<script setup lang="ts">
import { computed } from 'vue'
import { getWeatherDescription } from '../utils/weather'

const props = withDefaults(
  defineProps<{
    code?: number | null
    isDay?: boolean | null
    size?: 'small' | 'medium' | 'hero'
  }>(),
  {
    code: null,
    isDay: true,
    size: 'medium',
  },
)

const icon = computed(() => getWeatherDescription(props.code, props.isDay ?? true).icon)
const showSun = computed(() => icon.value === 'clear-day' || icon.value === 'partly-day')
const showMoon = computed(() => icon.value === 'clear-night' || icon.value === 'partly-night')
const showCloud = computed(() =>
  ['partly-day', 'partly-night', 'cloud', 'drizzle', 'rain', 'snow', 'storm', 'unknown'].includes(
    icon.value,
  ),
)
</script>

<template>
  <svg
    class="weather-icon"
    :class="`weather-icon--${size}`"
    viewBox="0 0 160 160"
    width="160"
    height="160"
    aria-hidden="true"
    focusable="false"
  >
    <g v-if="showSun" class="weather-icon__sun">
      <circle cx="66" cy="61" r="25" />
      <path d="M66 19v11M66 92v11M24 61h11M97 61h11M36 31l8 8M88 83l8 8M96 31l-8 8M44 83l-8 8" />
    </g>

    <path
      v-if="showMoon"
      class="weather-icon__moon"
      d="M89 27c-6 5-10 13-10 22 0 17 14 31 31 31 6 0 12-2 17-5-6 14-20 23-36 23-22 0-40-18-40-40 0-17 11-31 27-37 4-1 8-2 11-2-1 3-1 5 0 8Z"
    />

    <g v-if="showCloud" class="weather-icon__cloud">
      <path
        d="M42 111c-14 0-25-10-25-23 0-12 9-22 21-23 5-19 22-32 43-32 22 0 41 16 44 37 11 2 19 10 19 21 0 11-10 20-22 20H42Z"
      />
      <path class="weather-icon__cloud-highlight" d="M40 67c7-14 21-23 38-23 17 0 31 9 38 23" />
    </g>

    <g v-if="icon === 'fog'" class="weather-icon__fog">
      <path d="M27 64h107M17 84h112M33 104h110M24 124h91" />
    </g>

    <g v-if="icon === 'drizzle'" class="weather-icon__rain weather-icon__rain--soft">
      <path d="M54 121l-5 12M82 121l-5 12M110 121l-5 12" />
    </g>

    <g v-if="icon === 'rain'" class="weather-icon__rain">
      <path d="M48 119l-8 19M77 119l-8 19M106 119l-8 19M130 116l-7 17" />
    </g>

    <g v-if="icon === 'snow'" class="weather-icon__snow">
      <path d="M45 121v18M36 130h18M39 124l12 12M51 124l-12 12" />
      <path d="M81 116v18M72 125h18M75 119l12 12M87 119l-12 12" />
      <path d="M117 121v18M108 130h18M111 124l12 12M123 124l-12 12" />
    </g>

    <g v-if="icon === 'storm'" class="weather-icon__storm">
      <path d="M82 109 64 137h18l-7 22 29-35H86l10-15Z" />
      <path class="weather-icon__storm-rain" d="M42 119l-6 15M124 119l-6 15" />
    </g>

    <g v-if="icon === 'unknown'" class="weather-icon__unknown">
      <path d="M73 60c1-11 9-17 20-17 12 0 21 7 21 18 0 9-5 13-13 18-7 4-9 8-9 15" />
      <circle cx="91" cy="111" r="3" />
    </g>
  </svg>
</template>
