// BETZ Football API
// Server-side cache to reduce API quota usage

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const cache =
  globalThis.__BETZ_FOOTBALL_CACHE ||
  (globalThis.__BETZ_FOOTBALL_CACHE = new Map());

export default async function handler(req, res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://nizzarr-aj.github.io"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // Browser cache
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, stale-while-revalidate=300"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const API_KEY = process.env.API_FOOTBALL_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        error: "API_FOOTBALL_KEY is not configured"
      });
    }

    const {
      live,
      date,
      league,
      season,
      timezone
    } = req.query;

    const params = new URLSearchParams();

    if (live === "all") {
      params.set("live", "all");
    }

    if (date) {
      params.set("date", date);
    }

    if (league) {
      params.set("league", league);
    }

    if (season) {
      params.set("season", season);
    }

    if (timezone) {
      params.set("timezone", timezone);
    }

    const cacheKey = params.toString();
    const now = Date.now();

    // Check cache
    const cached = cache.get(cacheKey);

    if (cached && now - cached.time < CACHE_TTL) {
      return res.status(200).json({
        ...cached.data,
        _betz: {
          cached: true,
          cachedAt: new Date(cached.time).toISOString()
        }
      });
    }

    // Request API-Sports
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?${cacheKey}`,
      {
        headers: {
          "x-apisports-key": API_KEY
        }
      }
    );

    const data = await response.json();

    // If API quota/error and we have old data,
    // return the old data instead of breaking the website.
    if (!response.ok) {
      if (cached) {
        return res.status(200).json({
          ...cached.data,
          _betz: {
            cached: true,
            stale: true,
            cachedAt: new Date(cached.time).toISOString(),
            upstreamStatus: response.status
          }
        });
      }

      return res.status(response.status).json(data);
    }

    // Save fresh response
    cache.set(cacheKey, {
      time: now,
      data
    });

    return res.status(200).json({
      ...data,
      _betz: {
        cached: false,
        cachedAt: new Date(now).toISOString()
      }
    });

  } catch (error) {

    const cacheKey = new URLSearchParams(
      req.query || {}
    ).toString();

    const cached = cache.get(cacheKey);

    // Use old data if available
    if (cached) {
      return res.status(200).json({
        ...cached.data,
        _betz: {
          cached: true,
          stale: true,
          cachedAt: new Date(cached.time).toISOString()
        }
      });
    }

    return res.status(500).json({
      error: "Server error",
      message: error.message
    });
  }
}
