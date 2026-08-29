export default async function handler(req, res) {
  const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.status(400).json({ error: 'Missing q' });

  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Jref/1.0 (https://jref-theta.vercel.app/)' }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'DuckDuckGo API returned an error', status: response.status });
    }

    const data = await response.json();
    const results = [];

    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || q,
        url: data.AbstractURL,
        snippet: data.AbstractText,
        source: data.AbstractSource || 'DuckDuckGo'
      });
    }

    const topics = Array.isArray(data.RelatedTopics) ? data.RelatedTopics : [];
    for (const topic of topics) {
      if (topic.FirstURL && topic.Text) {
        results.push({
          title: topic.Text.split(' - ')[0].slice(0, 140),
          url: topic.FirstURL,
          snippet: topic.Text,
          source: 'DuckDuckGo'
        });
      }

      if (Array.isArray(topic.Topics)) {
        for (const nested of topic.Topics) {
          if (nested.FirstURL && nested.Text) {
            results.push({
              title: nested.Text.split(' - ')[0].slice(0, 140),
              url: nested.FirstURL,
              snippet: nested.Text,
              source: 'DuckDuckGo'
            });
          }
        }
      }
    }

    const unique = results.filter((item, index, arr) =>
      arr.findIndex(x => x.url === item.url) === index
    ).slice(0, 30);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      ok: true,
      query: q,
      provider: 'DuckDuckGo Instant Answers API',
      results: unique,
      fallback: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
    });
  } catch (error) {
    console.error('Jref DuckDuckGo API error:', error);
    return res.status(502).json({ error: 'Jref could not reach the DuckDuckGo API' });
  }
}
