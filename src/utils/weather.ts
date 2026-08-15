export type WeatherCategory = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm'

export type WeatherIconName =
  | 'clear-day'
  | 'clear-night'
  | 'partly-day'
  | 'partly-night'
  | 'cloud'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'unknown'

export interface WeatherDescription {
  label: string
  category: WeatherCategory
  icon: WeatherIconName
}

function daylightIcon(isDay: boolean, day: WeatherIconName, night: WeatherIconName) {
  return isDay ? day : night
}

export function getWeatherDescription(
  code: number | null | undefined,
  isDay = true,
): WeatherDescription {
  switch (code) {
    case 0:
      return {
        label: isDay ? 'Céu limpo' : 'Noite limpa',
        category: 'clear',
        icon: daylightIcon(isDay, 'clear-day', 'clear-night'),
      }
    case 1:
      return {
        label: 'Predominantemente limpo',
        category: 'clear',
        icon: daylightIcon(isDay, 'partly-day', 'partly-night'),
      }
    case 2:
      return {
        label: 'Parcialmente nublado',
        category: 'cloudy',
        icon: daylightIcon(isDay, 'partly-day', 'partly-night'),
      }
    case 3:
      return { label: 'Céu encoberto', category: 'cloudy', icon: 'cloud' }
    case 45:
      return { label: 'Nevoeiro', category: 'fog', icon: 'fog' }
    case 48:
      return { label: 'Nevoeiro com geada', category: 'fog', icon: 'fog' }
    case 51:
      return { label: 'Garoa fraca', category: 'rain', icon: 'drizzle' }
    case 53:
      return { label: 'Garoa moderada', category: 'rain', icon: 'drizzle' }
    case 55:
      return { label: 'Garoa forte', category: 'rain', icon: 'drizzle' }
    case 56:
    case 57:
      return { label: 'Garoa congelante', category: 'rain', icon: 'drizzle' }
    case 61:
      return { label: 'Chuva fraca', category: 'rain', icon: 'rain' }
    case 63:
      return { label: 'Chuva moderada', category: 'rain', icon: 'rain' }
    case 65:
      return { label: 'Chuva forte', category: 'rain', icon: 'rain' }
    case 66:
    case 67:
      return { label: 'Chuva congelante', category: 'rain', icon: 'rain' }
    case 71:
      return { label: 'Neve fraca', category: 'snow', icon: 'snow' }
    case 73:
      return { label: 'Neve moderada', category: 'snow', icon: 'snow' }
    case 75:
      return { label: 'Neve forte', category: 'snow', icon: 'snow' }
    case 77:
      return { label: 'Grãos de neve', category: 'snow', icon: 'snow' }
    case 80:
      return { label: 'Pancadas leves', category: 'rain', icon: 'drizzle' }
    case 81:
      return { label: 'Pancadas de chuva', category: 'rain', icon: 'rain' }
    case 82:
      return { label: 'Pancadas fortes', category: 'rain', icon: 'rain' }
    case 85:
    case 86:
      return { label: 'Pancadas de neve', category: 'snow', icon: 'snow' }
    case 95:
      return { label: 'Tempestade', category: 'storm', icon: 'storm' }
    case 96:
    case 99:
      return { label: 'Tempestade com granizo', category: 'storm', icon: 'storm' }
    default:
      return { label: 'Condição indisponível', category: 'cloudy', icon: 'unknown' }
  }
}
