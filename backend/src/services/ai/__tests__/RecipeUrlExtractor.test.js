const RecipeUrlExtractor = require('../RecipeUrlExtractor');

describe('RecipeUrlExtractor helpers', () => {
  const extractor = new RecipeUrlExtractor({
    requestRouter: { route: jest.fn() },
    recipeAgent: { extractIngredients: jest.fn() }
  });

  test('sanitizeHtml removes scripts and preserves text', () => {
    const html = `
      <html>
        <head>
          <style>.hidden { display:none; }</style>
          <script>console.log('test');</script>
        </head>
        <body>
          <h1>Best Cookies</h1>
          <p>Mix &amp; bake for 10 minutes.</p>
          <ul><li>1 cup flour</li><li>2 eggs</li></ul>
        </body>
      </html>
    `;

    const sanitized = extractor.sanitizeHtml(html);

    expect(sanitized).toContain('Best Cookies');
    expect(sanitized).toContain('Mix & bake for 10 minutes.');
    expect(sanitized).toContain('1 cup flour');
    expect(sanitized).not.toContain('console.log');
    expect(sanitized).not.toContain('hidden');
  });

  test('buildInstructionsText formats ingredients then directions', () => {
    const instructions = RecipeUrlExtractor.buildInstructionsText(
      ['1 cup flour', '2 eggs'],
      ['Mix everything', 'Bake until golden']
    );

    expect(instructions).toBe(
      'Ingredients:\n1. 1 cup flour\n2. 2 eggs\n\nDirections:\n1. Mix everything\n2. Bake until golden'
    );
  });

  test('parseDuration handles ISO 8601 durations', () => {
    expect(extractor.parseDuration('PT45M')).toBe(45);
    expect(extractor.parseDuration('PT1H30M')).toBe(90);
    expect(extractor.parseDuration('PT2H')).toBe(120);
    expect(extractor.parseDuration('invalid')).toBeNull();
  });

  test('deriveTitleFromUrl infers readable name', () => {
    expect(extractor.deriveTitleFromUrl('https://example.com/recipes/chocolate-cake.html')).toBe('Chocolate Cake');
    expect(extractor.deriveTitleFromUrl('invalid')).toBe('Imported Recipe');
  });
});

describe('fetchHtml bot-blocking fallback', () => {
  const makeExtractor = () => new RecipeUrlExtractor({
    requestRouter: { route: jest.fn() },
    recipeAgent: { extractIngredients: jest.fn() }
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('falls back to the reader proxy on 403 and returns its HTML', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 403, headers: { get: () => 'text/html' } })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'text/html' }, text: async () => '<html>recipe</html>' });

    await expect(makeExtractor().fetchHtml('https://example.com/r')).resolves.toBe('<html>recipe</html>');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][0]).toBe('https://r.jina.ai/https://example.com/r');
    expect(global.fetch.mock.calls[1][1].headers['X-Return-Format']).toBe('html');
  });

  test('surfaces the original blocked status when the reader also fails', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 403, headers: { get: () => 'text/html' } })
      .mockResolvedValueOnce({ ok: false, status: 451, headers: { get: () => 'text/html' } });

    await expect(makeExtractor().fetchHtml('https://example.com/r')).rejects.toMatchObject({
      message: 'Failed to fetch URL: 403',
      blockedBySite: true,
      upstreamStatus: 403
    });
  });

  test('does not use the reader for ordinary failures', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, headers: { get: () => 'text/html' } });

    await expect(makeExtractor().fetchHtml('https://example.com/r')).rejects.toMatchObject({
      message: 'Failed to fetch URL: 500',
      blockedBySite: false
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
