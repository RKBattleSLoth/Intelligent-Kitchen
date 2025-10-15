const { URL } = require('url');
const RequestRouter = require('./RequestRouter');
const RecipeAgent = require('./agents/RecipeAgent');

class RecipeUrlExtractor {
  constructor(options = {}) {
    this.router = options.requestRouter || new RequestRouter();
    this.recipeAgent = options.recipeAgent || new RecipeAgent();
    this.maxContentLength = options.maxContentLength || 20000;
    this.modelName = options.modelName || process.env.OPENROUTER_RECIPE_URL_MODEL || 'anthropic/claude-3-5-haiku';
  }

  async extract(url, { userId = 'url-importer' } = {}) {
    if (!url) {
      throw new Error('URL is required');
    }

    const html = await this.fetchHtml(url);
    const structured = this.extractStructuredData(html);
    const sanitized = this.sanitizeHtml(html);
    const truncatedContent = sanitized.slice(0, this.maxContentLength);

    const prompt = this.buildPrompt(url, truncatedContent, structured.primary);

    const aiResponse = await this.router.route('recipe_analysis', truncatedContent, {
      forceModelName: this.modelName,
      maxTokens: 1200,
      temperature: 0.1,
      priority: 'speed',
      prompt
    });

    const parsed = this.parseAiResponse(aiResponse.content);

    const title = parsed.title || structured.primary?.name || this.deriveTitleFromUrl(url);
    const description = parsed.description || structured.primary?.description || '';
    const ingredients = this.resolveList(parsed.ingredients, structured.primary?.recipeIngredient);
    const directions = this.resolveDirections(parsed.directions, structured.primary?.recipeInstructions);
    const instructionsText = RecipeUrlExtractor.buildInstructionsText(ingredients, directions);

    let ingredientExtraction = null;
    try {
      ingredientExtraction = await this.recipeAgent.extractIngredients({
        name: title,
        description,
        ingredients,
        instructions: directions.join('\n')
      }, userId, {
        includePreparation: true,
        priority: 'speed'
      });
    } catch (error) {
      console.warn('RecipeUrlExtractor: ingredient extraction failed', error.message);
    }

    return {
      success: true,
      sourceUrl: url,
      title,
      description,
      ingredients,
      directions,
      instructionsText,
      servings: parsed.servings || structured.primary?.recipeYield || null,
      prepTimeMinutes: parsed.prepTimeMinutes ?? this.parseDuration(structured.primary?.prepTime),
      cookTimeMinutes: parsed.cookTimeMinutes ?? this.parseDuration(structured.primary?.cookTime),
      totalTimeMinutes: parsed.totalTimeMinutes ?? this.parseDuration(structured.primary?.totalTime),
      aiMetadata: {
        model: aiResponse.routing?.modelName || this.modelName,
        routing: aiResponse.routing || null
      },
      structuredData: structured.primary ? this.pickStructuredFields(structured.primary) : null,
      ingredientExtraction
    };
  }

  async fetchHtml(url) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'IntelligentKitchenBot/1.0 (+https://intelligent-kitchen.ai)',
        Accept: 'text/html,application/xhtml+xml'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    return await response.text();
  }

  sanitizeHtml(html) {
    if (!html) return '';

    let cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, ' ');
    cleaned = cleaned.replace(/<!--([\s\S]*?)-->/g, ' ');
    cleaned = cleaned.replace(/<br\s*\/?>(?=\s*\n?)/gi, '\n');
    cleaned = cleaned.replace(/<\/(p|div|li|section|article|h[1-6]|tr)>/gi, '\n');
    cleaned = cleaned.replace(/<li[^>]*>/gi, '- ');
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');
    cleaned = this.decodeEntities(cleaned);
    cleaned = cleaned.replace(/\r/g, '\n');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/[\t ]{2,}/g, ' ');

    return cleaned.trim();
  }

  extractStructuredData(html) {
    const scripts = [];
    const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const content = match[1]?.trim();
      if (!content) continue;
      try {
        scripts.push(JSON.parse(content));
      } catch (error) {
        try {
          const fixed = content.replace(/\,\s*\}/g, '}').replace(/\,\s*\]/g, ']');
          scripts.push(JSON.parse(fixed));
        } catch (innerError) {
          console.warn('RecipeUrlExtractor: failed to parse JSON-LD block', innerError.message);
        }
      }
    }

    const recipes = [];
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      const type = node['@type'];
      if (type) {
        const types = Array.isArray(type) ? type : [type];
        if (types.map((t) => String(t).toLowerCase()).includes('recipe')) {
          recipes.push(node);
        }
      }
      Object.values(node).forEach(visit);
    };

    scripts.forEach(visit);

    return {
      all: scripts,
      primary: recipes[0] || null
    };
  }

  buildPrompt(url, content, structured) {
    const structuredHint = structured ? JSON.stringify(this.pickStructuredFields(structured), null, 2) : 'None';
    const clipped = content.length > this.maxContentLength ? `${content.slice(0, this.maxContentLength)}\n...` : content;

    return `You are an expert culinary data extraction assistant. Analyze the provided recipe webpage content and return a strict JSON object with the fields: title, description, ingredients (array of strings), directions (array of strings), servings (string or null), prepTimeMinutes (integer or null), cookTimeMinutes (integer or null), totalTimeMinutes (integer or null).

Rules:
- Use the structured hint when helpful.
- Ingredients should be concise lines like "1 cup sugar" without leading bullets.
- Directions should be ordered steps without numbering prefixes.
- Respond with raw JSON only. Do not include markdown fences or commentary.

Source URL: ${url}
Structured Recipe Hint: ${structuredHint}

Sanitized Page Content:
${clipped}`;
  }

  parseAiResponse(content) {
    if (!content) {
      throw new Error('Empty AI response');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not include JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    parsed.ingredients = this.ensureStringArray(parsed.ingredients);
    parsed.directions = this.ensureStringArray(parsed.directions);
    return parsed;
  }

  resolveList(primary, fallback) {
    const primaryList = this.ensureStringArray(primary);
    if (primaryList.length) return primaryList;

    if (!fallback) return [];
    if (Array.isArray(fallback)) {
      return fallback
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            if (item.text) return item.text;
            return Object.values(item).find((value) => typeof value === 'string') || '';
          }
          return '';
        })
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (typeof fallback === 'string') {
      return fallback.split(/\r?\n|\./).map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  resolveDirections(primary, fallback) {
    const directions = this.ensureStringArray(primary);
    if (directions.length) {
      return directions.map((line) => line.replace(/^\d+\.?\s*/, '').trim()).filter(Boolean);
    }

    const fallbackList = this.resolveList(null, fallback);
    return fallbackList.map((line) => line.replace(/^\d+\.?\s*/, '').trim());
  }

  ensureStringArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((item) => (typeof item === 'string' ? item : '')).map((item) => item.trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value.split(/\r?\n|\./).map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  parseDuration(value) {
    if (!value || typeof value !== 'string') return null;

    const isoMatch = value.match(/P(T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/i);
    if (!isoMatch) return null;

    const hours = parseInt(isoMatch[2] || '0', 10);
    const minutes = parseInt(isoMatch[3] || '0', 10);
    return hours * 60 + minutes || null;
  }

  pickStructuredFields(recipe) {
    const fields = ['name', 'description', 'recipeIngredient', 'recipeInstructions', 'recipeYield', 'prepTime', 'cookTime', 'totalTime'];
    return fields.reduce((acc, field) => {
      if (recipe[field]) {
        acc[field] = recipe[field];
      }
      return acc;
    }, {});
  }

  decodeEntities(text) {
    const entities = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };
    return text.replace(/&[a-zA-Z#0-9]+;/g, (entity) => entities[entity] || entity);
  }

  deriveTitleFromUrl(url) {
    try {
      const pathname = new URL(url).pathname.split('/').filter(Boolean);
      const lastSegment = pathname[pathname.length - 1] || 'Imported Recipe';
      return lastSegment.replace(/[-_]+/g, ' ').replace(/\.[a-z0-9]+$/i, '').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Imported Recipe';
    } catch (error) {
      return 'Imported Recipe';
    }
  }

  static buildInstructionsText(ingredients, directions) {
    const lines = [];
    if (ingredients.length) {
      lines.push('Ingredients:');
      ingredients.forEach((item, index) => {
        lines.push(`${index + 1}. ${item}`);
      });
      lines.push('');
    }
    if (directions.length) {
      lines.push('Directions:');
      directions.forEach((step, index) => {
        lines.push(`${index + 1}. ${step}`);
      });
    }
    return lines.join('\n').trim();
  }
}

module.exports = RecipeUrlExtractor;
