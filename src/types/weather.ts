export type TemperatureUnit = 'celsius' | 'fahrenheit'

export interface WeatherLocation {
  id?: number
  name: string
  admin1?: string
  country: string
  countryCode?: string
  latitude: number
  longitude: number
  timezone?: string
}

export interface CurrentWeather {
  time: string
  temperature: number | null
  apparentTemperature: number | null
  humidity: number | null
  precipitation: number | null
  weatherCode: number | null
  windSpeed: number | null
  isDay: boolean | null
}

export interface HourlyWeather {
  time: string
  temperature: number | null
  precipitationProbability: number | null
  weatherCode: number | null
  isDay: boolean | null
}

export interface DailyWeather {
  date: string
  weatherCode: number | null
  temperatureMax: number | null
  temperatureMin: number | null
  precipitationProbability: number | null
  sunrise: string | null
  sunset: string | null
  windSpeedMax: number | null
}

export interface WeatherUnits {
  temperature: string
  humidity: string
  precipitation: string
  precipitationProbability: string
  windSpeed: string
}

export interface WeatherForecast {
  timezone: string
  timezoneAbbreviation: string
  updatedAt: string
  unit: TemperatureUnit
  current: CurrentWeather
  hourly: HourlyWeather[]
  daily: DailyWeather[]
  units: WeatherUnits
}
