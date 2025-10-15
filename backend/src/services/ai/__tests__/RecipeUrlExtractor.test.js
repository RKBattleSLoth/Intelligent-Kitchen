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
