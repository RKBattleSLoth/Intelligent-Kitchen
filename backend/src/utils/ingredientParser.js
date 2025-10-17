const FRACTION_MAP = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8'
};

const UNICODE_FRACTIONS = new RegExp(`[${Object.keys(FRACTION_MAP).join('')}]`, 'g');

const UNITS = [
  'teaspoons?',
  'tsp',
  'tablespoons?',
  'tbsp',
  'cups?',
  'ounces?',
  'oz',
  'pints?',
  'quarts?',
  'gallons?',
  'liters?',
  'l',
  'milliliters?',
  'ml',
  'grams?',
  'g',
  'kilograms?',
  'kg',
  'pounds?',
  'lbs?',
  'sticks?',
  'cloves?',
  'heads?',
  'pieces?',
  'slices?',
  'cans?',
  'packages?',
  'bunches?',
  'sprigs?',
  'leaves?',
  'handfuls?',
  'pinches?',
  'dash(?:es)?'
];

const UNIT_REGEX = new RegExp(`^(?:${UNITS.join('|')})(?=\\b)`, 'i');

const INGREDIENT_KEYWORDS = [
  'salt', 'pepper', 'oil', 'sugar', 'flour', 'butter', 'onion', 'garlic', 'tomato', 'cheese',
  'chicken', 'beef', 'pork', 'fish', 'egg', 'milk', 'cream', 'herb', 'spice', 'lettuce',
  'apple', 'spinach', 'kale', 'rice', 'pasta', 'bean', 'broth', 'stock', 'vinegar', 'juice',
  'honey', 'maple', 'mustard', 'yogurt', 'walnut', 'pecan', 'almond', 'cashew', 'berry'
];

const KEYWORD_REGEX = new RegExp(`\\b(${INGREDIENT_KEYWORDS.join('|')})\\b`, 'i');

const NUMBERED_LINE_REGEX = /^\d+\.\s*/;
const BULLET_REGEX = /^[\-\*•●◦]\s*/;

const QUANTITY_REGEX = /^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d*(?:\.\d+)?))(?:\s*(?:-\s*)?(?:\d+\/\d+|\d*(?:\.\d+)?))?/;

function parseFraction(part) {
  if (/^\d+\s+\d+\/\d+$/.test(part)) {
    const [whole, fraction] = part.split(/\s+/);
    const [numerator, denominator] = fraction.split('/');
    const wholeNumber = parseInt(whole, 10);
    const fractional = parseInt(numerator, 10) / parseInt(denominator, 10);
    return wholeNumber + fractional;
  }
  if (/^\d+\/\d+$/.test(part)) {
    const [numerator, denominator] = part.split('/');
    return parseInt(numerator, 10) / parseInt(denominator, 10);
  }
  const numeric = parseFloat(part);
  return Number.isFinite(numeric) ? numeric : null;
}

function quantityStringToNumber(input) {
  if (!input) return null;
  const parts = input.split('-').map(part => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const values = parts
    .map(parseFraction)
    .filter(value => value !== null);

  if (values.length === 0) return null;

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(average * 1000) / 1000;
}

function normalizeFractions(input) {
  return input.replace(UNICODE_FRACTIONS, match => FRACTION_MAP[match] || match);
}

function cleanLine(line) {
  let result = normalizeFractions(line.trim());
  result = result.replace(NUMBERED_LINE_REGEX, '').trim();
  result = result.replace(BULLET_REGEX, '').trim();
  return result;
}

function looksLikeIngredient(line) {
  if (!line) return false;
  const lower = line.toLowerCase();
  const hasQuantity = QUANTITY_REGEX.test(lower);
  const hasUnit = UNIT_REGEX.test(lower);
  const hasKeyword = KEYWORD_REGEX.test(lower);
  return hasQuantity || hasUnit || hasKeyword;
}

function parseLine(line) {
  const cleaned = cleanLine(line);
  if (!cleaned) return null;

  if (!looksLikeIngredient(cleaned)) {
    return null;
  }

  let remaining = cleaned;
  let quantity = null;
  let unit = null;

  const quantityMatch = remaining.match(QUANTITY_REGEX);
  if (quantityMatch && quantityMatch[0].trim()) {
    quantity = quantityMatch[0].trim();
    remaining = remaining.slice(quantityMatch[0].length).trim();
  }

  const unitMatch = remaining.match(UNIT_REGEX);
  if (unitMatch && unitMatch[0].trim()) {
    unit = unitMatch[0].trim();
    remaining = remaining.slice(unitMatch[0].length).trim();
  }

  const name = remaining.replace(/^of\s+/i, '').trim();
  if (!name) {
    return null;
  }

  const parts = [];
  if (quantity) parts.push(quantity);
  if (unit) parts.push(unit);
  parts.push(name);

  return {
    original: line.trim(),
    text: parts.join(' '),
    quantity,
    quantityValue: quantityStringToNumber(quantity),
    unit,
    name
  };
}

function parseIngredientsFromInstructions(instructions) {
  const lines = instructions.split('\n');
  const items = [];
  let candidateLines = 0;

  for (const line of lines) {
    const cleaned = cleanLine(line);
    if (!cleaned) continue;

    if (looksLikeIngredient(cleaned)) {
      candidateLines++;
      const parsed = parseLine(line);
      if (parsed) {
        items.push(parsed);
      }
    }
  }

  const denominator = candidateLines || lines.length || 1;
  const confidence = Math.min(1, items.length / denominator);

  return {
    items,
    candidateLines,
    confidence
  };
}

module.exports = {
  parseIngredientsFromInstructions,
  cleanLine,
  looksLikeIngredient
};
