import type { TemperatureUnit, WeatherForecast } from '../types/weather'

export function weatherFixture(
  unit: TemperatureUnit = 'celsius',
  temperature = unit === 'celsius' ? 20 : 68,
): WeatherForecast {
  const symbol = unit === 'celsius' ? '°C' : '°F'
  return {
    timezone: 'America/Sao_Paulo',
    timezoneAbbreviation: 'GMT-3',
    updatedAt: '2026-08-14T10:30',
    unit,
    current: {
      time: '2026-08-14T10:30',
      temperature,
      apparentTemperature: temperature - 1,
      humidity: 70,
      precipitation: 0,
      weatherCode: 2,
      windSpeed: 12,
      isDay: true,
    },
    hourly: [{
      time: '2026-08-14T10:00',
      temperature,
      precipitationProbability: 25,
      weatherCode: 2,
      isDay: true,
    }],
    daily: [{
      date: '2026-08-14',
      weatherCode: 2,
      temperatureMax: temperature + 4,
      temperatureMin: temperature - 4,
      precipitationProbability: 30,
      sunrise: '2026-08-14T06:30',
      sunset: '2026-08-14T17:45',
      windSpeedMax: 20,
    }],
    units: {
      temperature: symbol,
      humidity: '%',
      precipitation: 'mm',
      precipitationProbability: '%',
      windSpeed: 'km/h',
    },
  }
}
