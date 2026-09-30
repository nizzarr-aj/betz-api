export default async function handler(req, res) {
  try {
    const API_KEY = process.env.API_FOOTBALL_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        error: "API_FOOTBALL_KEY is not configured"
      });
    }

    const { live, date, league, season } = req.query;

    const params = new URLSearchParams();

    // Live matches
    if (live === "all") {
      params.set("live", "all");
    }

    // Matches by date
    if (date) {
      params.set("date", date);
    }

    // Optional league
    if (league) {
      params.set("league", league);
    }

    // Optional season
    if (season) {
      params.set("season", season);
    }

    const url =
      `https://v3.football.api-sports.io/fixtures?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-apisports-key": API_KEY
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "API-Football request failed",
        details: data
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      message: error.message
    });
  }
}
