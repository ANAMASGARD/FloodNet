// ─── GET /api/weather?lat=...&lng=... — Current weather + forecast for map ───
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchForecast, fetchCurrentWeather } from "@/lib/services/openweather";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng query params required" },
      { status: 400 },
    );
  }

  try {
    const [current, forecast] = await Promise.all([
      fetchCurrentWeather(lat, lng),
      fetchForecast(lat, lng),
    ]);

    // Build rain heatmap data from forecast
    const rainPoints = forecast.list.map((entry) => ({
      dt: entry.dt,
      dt_txt: entry.dt_txt,
      rain_mm: entry.rain?.["3h"] ?? 0,
      pop: Math.round(entry.pop * 100),
      temp: entry.main.temp,
      humidity: entry.main.humidity,
      wind: entry.wind.speed,
      weather: entry.weather[0]?.description ?? "",
    }));

    // 24h rain accumulation
    const next24h = rainPoints.slice(0, 8); // 8 x 3h = 24h
    const totalRain24h = next24h.reduce((sum, p) => sum + p.rain_mm, 0);
    const maxPop24h = Math.max(...next24h.map((p) => p.pop));

    return NextResponse.json({
      current: {
        city: current.name,
        temp: current.main.temp,
        humidity: current.main.humidity,
        weather: current.weather[0]?.description ?? "",
        wind: current.wind.speed,
        rain_1h: current.rain?.["1h"] ?? 0,
      },
      forecast: rainPoints,
      summary: {
        totalRain24h: Math.round(totalRain24h * 10) / 10,
        maxPop24h,
        cityName: forecast.city.name,
        country: forecast.city.country,
      },
    });
  } catch (err) {
    console.error("[weather] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Weather fetch failed" },
      { status: 500 },
    );
  }
}
