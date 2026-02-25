// ─── OpenWeather Forecast Service ───
// Fetches 5-day / 3-hour forecast for a given coordinate.

const OW_BASE = "https://api.openweathermap.org/data/2.5";

export interface ForecastEntry {
  dt: number;
  dt_txt: string;
  main: {
    temp: number;
    humidity: number;
    pressure: number;
  };
  weather: { id: number; main: string; description: string }[];
  wind: { speed: number; gust?: number };
  rain?: { "3h"?: number };
  snow?: { "3h"?: number };
  pop: number; // probability of precipitation 0-1
}

export interface OpenWeatherForecast {
  city: {
    name: string;
    country: string;
    coord: { lat: number; lon: number };
  };
  list: ForecastEntry[];
}

export async function fetchForecast(
  lat: number,
  lng: number,
): Promise<OpenWeatherForecast> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY is not set");

  const url = `${OW_BASE}/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenWeather API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<OpenWeatherForecast>;
}

// ─── Current weather (for heatmap / quick status) ───
export interface CurrentWeather {
  name: string;
  main: { temp: number; humidity: number; pressure: number };
  weather: { id: number; main: string; description: string }[];
  wind: { speed: number; gust?: number };
  rain?: { "1h"?: number; "3h"?: number };
  coord: { lat: number; lon: number };
}

export async function fetchCurrentWeather(
  lat: number,
  lng: number,
): Promise<CurrentWeather> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY is not set");

  const url = `${OW_BASE}/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenWeather API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<CurrentWeather>;
}

// ─── Summarize forecast for LLM context ───
export function summarizeForecast(forecast: OpenWeatherForecast): string {
  const lines: string[] = [];
  lines.push(`City: ${forecast.city.name}, ${forecast.city.country}`);
  lines.push(`Coordinates: ${forecast.city.coord.lat}, ${forecast.city.coord.lon}`);
  lines.push("--- 5-day / 3-hour forecast ---");

  for (const entry of forecast.list) {
    const rain = entry.rain?.["3h"] ?? 0;
    const weather = entry.weather.map((w) => w.description).join(", ");
    const pop = Math.round(entry.pop * 100);
    lines.push(
      `${entry.dt_txt} | ${weather} | Temp: ${entry.main.temp}°C | ` +
        `Humidity: ${entry.main.humidity}% | Rain(3h): ${rain}mm | ` +
        `Wind: ${entry.wind.speed}m/s | PoP: ${pop}%`,
    );
  }

  return lines.join("\n");
}
