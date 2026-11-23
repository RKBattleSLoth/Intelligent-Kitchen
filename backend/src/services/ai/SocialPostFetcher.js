const { URL } = require('url');

// Instagram and TikTok serve a login wall to server-side fetches, so the
// normal HTML pipeline sees no recipe and falls back to the URL slug as the
// title. Creators almost always put the recipe (or a link to it) in the post
// caption, so we fetch just the caption and hand that to the extractor.

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

class SocialPostFetcher {
  constructor(options = {}) {
    this.readerBaseUrl = options.readerBaseUrl || process.env.RECIPE_READER_BASE_URL || 'https://r.jina.ai/';
  }

  static detectPlatform(url) {
    let host;
    try {
      host = new URL(url).hostname.toLowerCase().replace(/^www\.|^m\./, '');
    } catch (error) {
      return null;
    }
    if (host === 'instagram.com' || host === 'instagr.am') return 'instagram';
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok';
    return null;
  }

  // Share links carry tracking params (?igsh=, ?jplx=...) that add nothing.
  static canonicalUrl(url) {
    try {
      const parsed = new URL(url);
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    } catch (error) {
      return url;
    }
  }

  async fetchPost(url) {
    const platform = SocialPostFetcher.detectPlatform(url);
    if (!platform) return null;
    const canonical = SocialPostFetcher.canonicalUrl(url);

    const attempts = platform === 'instagram'
      ? [() => this.viaReader(canonical, platform), () => this.viaOgTags(canonical, platform)]
      : [() => this.viaTikTokOembed(url), () => this.viaTikTokPage(url), () => this.viaReader(canonical, platform), () => this.viaOgTags(canonical, platform)];

    for (const attempt of attempts) {
      try {
        const post = await attempt();
        if (post && post.caption && post.caption.trim().length > 0) {
          return { platform, url: canonical, ...post, caption: post.caption.trim() };
        }
      } catch (error) {
        console.warn(`SocialPostFetcher: ${platform} attempt failed for ${canonical}`, error.message);
      }
    }
    return { platform, url: canonical, author: null, caption: '' };
  }

  // Jina Reader renders the page in a real browser; its "Title:" line is
  // `<author> on Instagram: "<full caption>"` even behind the login wall.
  async viaReader(url, platform) {
    const response = await fetch(`${this.readerBaseUrl}${url}`, {
      headers: process.env.JINA_API_KEY ? { Authorization: `Bearer ${process.env.JINA_API_KEY}` } : {}
    });
    if (!response.ok) return null;
    return SocialPostFetcher.parseReaderTitle(await response.text(), platform);
  }

  static parseReaderTitle(text, platform) {
    if (!text) return null;
    const head = text.split(/\n(?:URL Source|Markdown Content):/)[0] || '';
    const match = head.match(/^Title:\s*([\s\S]*)$/m);
    if (!match) return null;
    const title = match[1].trim();
    const label = platform === 'tiktok' ? 'TikTok' : 'Instagram';
    const quoted = title.match(new RegExp(`^(.*?)\\s+on\\s+${label}:\\s*"([\\s\\S]*)"\\s*$`, 'i'));
    if (quoted) {
      return { author: quoted[1].trim(), caption: quoted[2] };
    }
    if (/log in|sign up/i.test(title) && title.length < 40) return null;
    return { author: null, caption: title };
  }

  async viaTikTokOembed(url) {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return { author: data.author_name || null, caption: data.title || '' };
  }

  async viaTikTokPage(url) {
    const response = await fetch(url, { headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' } });
    if (!response.ok) return null;
    const html = await response.text();
    const desc = html.match(/"desc":"((?:[^"\\]|\\.)*)"/);
    if (!desc) return null;
    const author = html.match(/"nickname":"((?:[^"\\]|\\.)*)"/);
    return {
      author: author ? JSON.parse(`"${author[1]}"`) : null,
      caption: JSON.parse(`"${desc[1]}"`)
    };
  }

  async viaOgTags(url) {
    const response = await fetch(url, { headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' } });
    if (!response.ok) return null;
    const html = await response.text();
    const og = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
    if (!og) return null;
    return { author: null, caption: SocialPostFetcher.decodeEntities(og[1]) };
  }

  // Links in the caption that point at a recipe page (blog, Substack, etc.),
  // skipping social and link-in-bio hosts.
  static recipeLinks(caption) {
    const skip = /(instagram\.com|instagr\.am|tiktok\.com|youtube\.com|youtu\.be|facebook\.com|linktr\.ee|beacons\.ai|stan\.store|ltk\.app|liketk\.it|amzn\.to|amazon\.com)/i;
    const links = (caption || '').match(/https?:\/\/[^\s"'<>)]+/gi) || [];
    return [...new Set(links.map(link => link.replace(/[.,!?]+$/, '')))].filter(link => !skip.test(link));
  }

  // Rough check: does the caption itself contain an ingredient list?
  static looksLikeFullRecipe(caption) {
    const lines = (caption || '').split(/\n/);
    const measured = lines.filter(line => /(\d|½|⅓|¼|¾|⅔)\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|cloves?|cans?|sheets?|package|medium|large|small|pinch)\b/i.test(line));
    return measured.length >= 3 || /\bingredients\b/i.test(caption || '');
  }

  static decodeEntities(text) {
    return text
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }
}

module.exports = SocialPostFetcher;
