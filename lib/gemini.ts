import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error(
    "Please define the GOOGLE_GEMINI_API_KEY environment variable inside .env.local"
  );
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Configuration for the model
const generationConfig = {
  temperature: 0.5,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
};

// Safety settings to block harmful content
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Analyzes article text using the Gemini API.
 * @param articleText The text content of the article to analyze.
 * @param category The category of the link.
 * @param keyword Optional keyword to emphasize.
 * @returns A promise that resolves to an object with { summary, tags, extraInfo }.
 */
export async function getAiAnalysis(
  articleText: string,
  category: string,
  keyword: string
): Promise<{ summary: string[]; tags: string[]; extraInfo: string }> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig,
      safetySettings,
    });

    const prompt = `
      You are an expert summarizer and knowledge assistant. Based on the following article text, please return a JSON object with three keys:
      1. "summary": A concise 3-bullet-point summary of the article as an array of strings.
      2. "tags": An array of 5 relevant string keywords for categorization.
      3. "extraInfo": A short paragraph (2-3 sentences) of additional information.

      The user has categorized this article as: ${category}.
      ${keyword ? `
      CRITICAL INSTRUCTION: The user has requested special emphasis on the keyword: "${keyword}". 
      - If the keyword represents an attribute (like "Location", "Stats", "History") of the article's main subject, extract that specific information from the article and include it in your summary. For example, if the article is about a 'Sword' and the keyword is 'Location', tell the user where the sword is located based on the article.
      - In the "extraInfo" field, provide fascinating, external knowledge about the main subject of the article combined with the keyword, providing context that might not be in the text itself. Do not just define what the word "${keyword}" means in a vacuum.
      ` : `
      - In the "extraInfo" field, provide a general interesting, external fact related to the main subject of the article.
      `}

      Article Text: """
      ${articleText.substring(0, 25000)}
      """

      Return *only* the valid JSON object and nothing else.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const rawText = response.text();

    // Find the JSON block, even if it's wrapped in markdown
    const jsonMatch = rawText.match(/```(json)?([\s\S]*?)```/);

    // Use the matched JSON or assume the whole string is JSON
    const jsonText = jsonMatch ? jsonMatch[2].trim() : rawText.trim();

    // Parse the cleaned-up JSON string
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error in getAiAnalysis:", error);
    throw new Error("Failed to get AI analysis.");
  }
}
