export default async function handler(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.status(400).json({ error: 'Missing q' });

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Jref/1.0; +https://jref-theta.vercel.app/)'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'DuckDuckGo search failed' });
    }

    const html = await response.text();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: 'Unable to reach DuckDuckGo' });
  }
}
