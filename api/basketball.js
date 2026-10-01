// BETZ Basketball API
// Server-side cache to reduce API quota usage

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const cache =
  globalThis.__BETZ_BASKETBALL_CACHE ||
  (globalThis.__BETZ_BASKETBALL_CACHE = new Map());

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
      date,
      league,
      season,
      timezone
    } = req.query;

    const params = new URLSearchParams();

    // Date
    if (date) {
      params.set("date", date);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      params.set("date", today);
    }

    // Optional filters
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

    // =========================
    // CHECK CACHE
    // =========================

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

    // =========================
    // REQUEST API-SPORTS
    // =========================

    const response = await fetch(
      `https://v1.basketball.api-sports.io/games?${cacheKey}`,
      {
        headers: {
          "x-apisports-key": API_KEY
        }
      }
    );

    const data = await response.json();

    // =========================
    // API ERROR / QUOTA
    // =========================

    if (!response.ok) {

      // If we have old data,
      // return it instead of breaking the website.

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

    // =========================
    // SAVE FRESH DATA
    // =========================

    cache.set(cacheKey, {
      time: now,
      data
    });

    // =========================
    // RETURN DATA
    // =========================

    return res.status(200).json({
      ...data,

      _betz: {
        cached: false,
        cachedAt: new Date(now).toISOString()
      }
    });

  } catch (error) {

    // =========================
    // FALLBACK TO OLD CACHE
    // =========================

    const cacheKey = new URLSearchParams(
      req.query || {}
    ).toString();

    const cached = cache.get(cacheKey);

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

    // =========================
    // SERVER ERROR
    // =========================

    return res.status(500).json({
      error: "Server error",
      message: error.message
    });
  }
}
