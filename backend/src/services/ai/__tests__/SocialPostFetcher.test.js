const SocialPostFetcher = require('../SocialPostFetcher');
const RecipeUrlExtractor = require('../RecipeUrlExtractor');

describe('SocialPostFetcher', () => {
  afterEach(() => { delete global.fetch; });

  test('detects Instagram and TikTok hosts', () => {
    expect(SocialPostFetcher.detectPlatform('https://www.instagram.com/reel/abc/?igsh=x')).toBe('instagram');
    expect(SocialPostFetcher.detectPlatform('https://vm.tiktok.com/ZM123/')).toBe('tiktok');
    expect(SocialPostFetcher.detectPlatform('https://www.tiktok.com/@chef/video/1')).toBe('tiktok');
    expect(SocialPostFetcher.detectPlatform('https://example.com/recipe')).toBeNull();
  });

  test('strips share tracking params', () => {
    expect(SocialPostFetcher.canonicalUrl('https://www.instagram.com/reel/Df3NEv9vRQA/?avpt=MTN==')).toBe('https://www.instagram.com/reel/Df3NEv9vRQA/');
  });

  test('parses the caption out of the reader title line', () => {
    const text = 'Title: Molly on Instagram: "Line one\n\n1 cup "good" flour"\n\nURL Source: https://www.instagram.com/reel/x/\n\nMarkdown Content:\nLog In';
    expect(SocialPostFetcher.parseReaderTitle(text, 'instagram')).toEqual({ author: 'Molly', caption: 'Line one\n\n1 cup "good" flour' });
  });

  test('ignores login-wall titles', () => {
    expect(SocialPostFetcher.parseReaderTitle('Title: Log in | TikTok\n\nURL Source: x', 'tiktok')).toBeNull();
  });

  test('finds recipe links but skips social and link-in-bio hosts', () => {
    const caption = 'Recipe: https://whatmollymade.com/salad/. More at https://linktr.ee/molly and https://www.instagram.com/molly';
    expect(SocialPostFetcher.recipeLinks(caption)).toEqual(['https://whatmollymade.com/salad/']);
  });

  test('tells a full caption recipe from a teaser', () => {
    expect(SocialPostFetcher.looksLikeFullRecipe('2 tbsp olive oil\n1½ tbsp maple syrup\n1 can (15 oz) chickpeas')).toBe(true);
    expect(SocialPostFetcher.looksLikeFullRecipe('so good - recipe on substack friday')).toBe(false);
  });

  test('uses TikTok oEmbed title as the caption', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ title: 'Easy stuffing 1 cup broth', author_name: 'chef' }) });
    const post = await new SocialPostFetcher().fetchPost('https://www.tiktok.com/@chef/video/1?is_from_webapp=1');
    expect(post).toMatchObject({ platform: 'tiktok', author: 'chef', caption: 'Easy stuffing 1 cup broth' });
  });
});

describe('RecipeUrlExtractor social posts', () => {
  const makeExtractor = (post, aiContent = null) => new RecipeUrlExtractor({
    requestRouter: { route: jest.fn().mockResolvedValue(aiContent ? { content: aiContent } : null) },
    recipeAgent: null,
    cache: { isEnabled: false },
    socialFetcher: { fetchPost: jest.fn().mockResolvedValue(post) }
  });

  test('builds a recipe from a caption via the AI step', async () => {
    const ai = JSON.stringify({ title: 'Butternut Squash Salad', ingredients: ['1 medium butternut squash', '2 tbsp olive oil', '1 apple'], directions: ['Roast squash', 'Toss'] });
    const result = await makeExtractor({ platform: 'instagram', url: 'https://www.instagram.com/reel/x/', author: 'Gabi', caption: '1 medium butternut squash\n2 tbsp olive oil\n1 apple' }, ai)
      .extract('https://www.instagram.com/reel/x/?igsh=1');
    expect(result.title).toBe('Butternut Squash Salad');
    expect(result.ingredients).toHaveLength(3);
    expect(result.sourceUrl).toBe('https://www.instagram.com/reel/x/');
  });

  test('keeps the caption verbatim when the AI step fails on a full recipe', async () => {
    const caption = '🍂 Fall salad\n1 medium squash\n2 tbsp olive oil\n1 can chickpeas';
    const result = await makeExtractor({ platform: 'instagram', url: 'u', author: null, caption }).extract('https://www.instagram.com/reel/x/');
    expect(result.title).toBe('Fall salad');
    expect(result.instructionsText).toBe(caption);
  });

  test('flags teaser posts without a recipe', async () => {
    const result = await makeExtractor({ platform: 'instagram', url: 'u', author: 'katie', caption: 'day 7: spinach dip - recipe on substack friday' }).extract('https://www.instagram.com/reel/x/');
    expect(result.instructionsText).toMatch(/doesn't include the full recipe/);
  });

  test('errors clearly when no caption can be read', async () => {
    await expect(makeExtractor({ platform: 'tiktok', url: 'u', author: null, caption: '' }).extract('https://www.tiktok.com/@a/video/1'))
      .rejects.toThrow(/Couldn't read that TikTok post's caption/);
  });
});
