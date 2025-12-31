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
 * @returns A promise that resolves to an object with { summary, tags }.
 */
export async function getAiAnalysis(
  articleText: string
): Promise<{ summary: string[]; tags: string[] }> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig,
      safetySettings,
    });

    const prompt = `
      You are an expert summarizer. Based on the following article text, please return a JSON object with two keys:
      1. "summary": A concise 3-bullet-point summary of the article as an array of strings.
      2. "tags": An array of 5 relevant string keywords for categorization.

      Article Text: """
      ${articleText.substring(0, 3000)}
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
