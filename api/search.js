export default async function handler(req, res) {
  const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';

  if (!q) {
    return res.status(400).json({ error: 'Missing q' });
  }

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=us-en`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error('DuckDuckGo HTTP status:', response.status);
      return res.status(502).json({ error: 'DuckDuckGo returned an error', status: response.status });
    }

    const html = await response.text();
    if (!html || html.length < 100) {
      return res.status(502).json({ error: 'DuckDuckGo returned an empty response' });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Jref DuckDuckGo proxy error:', error);
    return res.status(502).json({ error: 'Jref could not reach DuckDuckGo' });
  }
}
