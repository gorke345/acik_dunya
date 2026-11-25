import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getNextWeather,
  getWeatherPreset,
  advanceWeatherCycle,
  DEFAULT_WEATHER_CYCLE_SECONDS,
} from './weatherSystem';

test('weather toggle cycles deterministically through clear, rainy, and foggy', () => {
  assert.equal(getNextWeather('clear'), 'rainy');
  assert.equal(getNextWeather('rainy'), 'foggy');
  assert.equal(getNextWeather('foggy'), 'clear');
});

test('weather presets enforce distinct visibility and lighting profiles', () => {
  const clear = getWeatherPreset('clear');
  const rainy = getWeatherPreset('rainy');
  const foggy = getWeatherPreset('foggy');

  // Foggy has heaviest fog density, rainy has moderate haze, clear has widest visibility
  assert.ok(foggy.fogDensity > rainy.fogDensity, 'Foggy must reduce visibility more than rainy');
  assert.ok(rainy.fogDensity > clear.fogDensity, 'Rainy must reduce visibility more than clear');

  // Clear is brightest, rainy dims the sun and enables rain streaks
  assert.ok(clear.sunIntensity > rainy.sunIntensity);
  assert.equal(rainy.rainIntensity, 1);
  assert.equal(clear.rainIntensity, 0);
  assert.equal(foggy.rainIntensity, 0);

  // Rainy and foggy produce subtle ambient audio gains
  assert.ok(rainy.ambientGain > 0);
  assert.ok(foggy.ambientGain > 0);
});

test('automatic weather cycle advances after duration and respects disable flag', () => {
  const locked = advanceWeatherCycle('clear', 54, 5, false, DEFAULT_WEATHER_CYCLE_SECONDS);
  assert.equal(locked.changed, false);
  assert.equal(locked.weather, 'clear');

  const mid = advanceWeatherCycle('clear', 20, 5, true, 50);
  assert.equal(mid.changed, false);
  assert.equal(mid.weather, 'clear');
  assert.equal(mid.nextElapsed, 25);

  const next = advanceWeatherCycle('clear', 48, 4, true, 50);
  assert.equal(next.changed, true);
  assert.equal(next.weather, 'rainy');
  assert.equal(next.nextElapsed, 2);
});
