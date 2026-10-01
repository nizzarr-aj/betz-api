export default async function handler(req, res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://nizzarr-aj.github.io"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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

    const { date, league, season, timezone } = req.query;

    const params = new URLSearchParams();

    if (date) {
      params.set("date", date);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      params.set("date", today);
    }

    if (league) params.set("league", league);
    if (season) params.set("season", season);
    if (timezone) params.set("timezone", timezone);

    const response = await fetch(
      `https://v1.basketball.api-sports.io/games?${params.toString()}`,
      {
        headers: {
          "x-apisports-key": API_KEY
        }
      }
    );

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      message: error.message
    });
  }
}
