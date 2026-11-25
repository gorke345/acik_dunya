export type WeatherType = 'clear' | 'rainy' | 'foggy';

export interface WeatherPreset {
  id: WeatherType;
  labelTr: string;
  descriptionTr: string;
  skyHex: string;
  fogDensity: number;
  sunIntensity: number;
  sunHex: string;
  hemiIntensity: number;
  hemiSkyHex: string;
  hemiGroundHex: string;
  cloudHex: string;
  cloudOpacity: number;
  cloudSpeedMult: number;
  rainIntensity: number;
  ambientGain: number;
}

export const WEATHER_ORDER: readonly WeatherType[] = ['clear', 'rainy', 'foggy'];
export const DEFAULT_WEATHER_CYCLE_SECONDS = 55;

export const WEATHER_PRESETS: Record<WeatherType, WeatherPreset> = {
  clear: {
    id: 'clear',
    labelTr: 'Açık Hava',
    descriptionTr: 'Berrak gökyüzü ve geniş görüş mesafesi',
    skyHex: '#a4cde6',
    fogDensity: 0.0046,
    sunIntensity: 1.58,
    sunHex: '#ffe9c2',
    hemiIntensity: 0.68,
    hemiSkyHex: '#8fc3eb',
    hemiGroundHex: '#4b5c34',
    cloudHex: '#ffffff',
    cloudOpacity: 0.85,
    cloudSpeedMult: 1.0,
    rainIntensity: 0,
    ambientGain: 0.0,
  },
  rainy: {
    id: 'rainy',
    labelTr: 'Yağmurlu',
    descriptionTr: 'Sağanak yağış ve daralan görüş mesafesi',
    skyHex: '#6c8496',
    fogDensity: 0.0125,
    sunIntensity: 0.72,
    sunHex: '#c6d8e6',
    hemiIntensity: 0.56,
    hemiSkyHex: '#768ea3',
    hemiGroundHex: '#354334',
    cloudHex: '#7d8e9c',
    cloudOpacity: 0.94,
    cloudSpeedMult: 2.5,
    rainIntensity: 1.0,
    ambientGain: 0.055,
  },
  foggy: {
    id: 'foggy',
    labelTr: 'Sisli',
    descriptionTr: 'Yoğun yayla sisi ve kısıtlı görüş mesafesi',
    skyHex: '#c4cfd6',
    fogDensity: 0.0255,
    sunIntensity: 0.86,
    sunHex: '#e6ecef',
    hemiIntensity: 0.82,
    hemiSkyHex: '#cfdce2',
    hemiGroundHex: '#59665e',
    cloudHex: '#dde4e8',
    cloudOpacity: 0.92,
    cloudSpeedMult: 0.7,
    rainIntensity: 0,
    ambientGain: 0.04,
  },
};

export function getWeatherPreset(weather: WeatherType): WeatherPreset {
  return WEATHER_PRESETS[weather];
}

export function getNextWeather(current: WeatherType): WeatherType {
  const idx = WEATHER_ORDER.indexOf(current);
  return WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
}

export function advanceWeatherCycle(
  current: WeatherType,
  elapsedSec: number,
  dt: number,
  autoCycleEnabled: boolean,
  cycleDurationSec = DEFAULT_WEATHER_CYCLE_SECONDS
): { weather: WeatherType; nextElapsed: number; changed: boolean } {
  if (!autoCycleEnabled || cycleDurationSec <= 0) {
    return { weather: current, nextElapsed: elapsedSec, changed: false };
  }
  const updated = elapsedSec + Math.max(0, dt);
  if (updated >= cycleDurationSec) {
    return {
      weather: getNextWeather(current),
      nextElapsed: updated - cycleDurationSec,
      changed: true,
    };
  }
  return { weather: current, nextElapsed: updated, changed: false };
}
