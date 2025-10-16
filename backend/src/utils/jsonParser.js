/**
 * Robust JSON parser for AI responses
 * Handles nested structures, trailing content, and malformed JSON
 */

function extractAndParseJSON(text) {
  // Method 1: Try simple regex match (for well-formed JSON)
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Continue to next method
  }

  // Method 2: Find JSON by tracking brace depth
  try {
    let braceCount = 0;
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (startIndex === -1) {
          startIndex = i;
        }
        braceCount++;
      } else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          endIndex = i + 1;
          break;
        }
      }
    }

    if (startIndex !== -1 && endIndex !== -1) {
      const jsonStr = text.substring(startIndex, endIndex);
      return JSON.parse(jsonStr);
    }
  } catch (e) {
    // Continue to next method
  }

  // Method 3: Try to fix common JSON issues
  try {
    // Remove trailing commas
    let cleaned = text.replace(/,\s*([}\]])/g, '$1');
    
    // Try extraction again
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Continue to next method
  }

  // Method 4: Try to extract partial JSON by looking for common patterns
  try {
    // If we can't find valid JSON, try to extract array of objects
    const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
  } catch (e) {
    // Give up
  }

  // Method 5: Return null and let caller handle gracefully
  throw new Error(`Failed to extract valid JSON from response. Text length: ${text.length}`);
}

module.exports = {
  extractAndParseJSON
};
