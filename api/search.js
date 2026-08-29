export default async function handler(req, res) {
  const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.status(400).json({ error: 'Missing q' });

  const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Jref/1.0; +https://jref-theta.vercel.app/)'
      },
      redirect: 'follow'
    });

    const text = await response.text();
    if (!response.ok) {
      console.error('DuckDuckGo HTTP error:', response.status, text.slice(0, 300));
      return res.status(502).json({
        error: 'DuckDuckGo returned an error',
        status: response.status
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('DuckDuckGo returned non-JSON data:', text.slice(0, 300));
      return res.status(502).json({ error: 'DuckDuckGo returned an invalid response' });
    }

    const results = [];

    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || q,
        url: data.AbstractURL,
        snippet: data.AbstractText,
        source: data.AbstractSource || 'DuckDuckGo'
      });
    }

    const addTopic = (topic) => {
      if (topic && topic.FirstURL && topic.Text) {
        results.push({
          title: topic.Text.split(' - ')[0].slice(0, 140),
          url: topic.FirstURL,
          snippet: topic.Text,
          source: 'DuckDuckGo'
        });
      }
    };

    for (const topic of Array.isArray(data.RelatedTopics) ? data.RelatedTopics : []) {
      addTopic(topic);
      if (Array.isArray(topic?.Topics)) topic.Topics.forEach(addTopic);
    }

    const unique = results
      .filter((item, index, arr) => arr.findIndex(x => x.url === item.url) === index)
      .slice(0, 30);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      ok: true,
      query: q,
      provider: 'DuckDuckGo',
      results: unique,
      fallback: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
    });
  } catch (error) {
    console.error('Jref DuckDuckGo API error:', error);
    return res.status(502).json({
      error: 'Jref could not reach the DuckDuckGo API',
      details: error?.message || 'Unknown network error'
    });
  }
}
