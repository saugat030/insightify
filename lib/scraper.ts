// lib/scraper.ts
import * as cheerio from "cheerio";

interface ScrapedData {
  title: string;
  imageUrl: string | null;
  textContent: string;
}

/**
 * Scrapes a given URL for its title, main image, and article text.
 * @param url The URL of the page to scrape.
 * @returns A promise that resolves to an object with { title, imageUrl, textContent }.
 */
export async function scrapeUrl(url: string): Promise<ScrapedData> {
  try {
    // 1. Fetch the HTML
    const response = await fetch(url, {
      headers: {
        // Use a common user-agent to avoid simple bot blockers
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 2. Scrape the metadata
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").first().text() ||
      $("h1").first().text();

    const imageUrl = $('meta[property="og:image"]').attr("content") || null;

    // 3. Scrape the main content
    // Try common article containers first
    let textContent = $("article").text() || $("main").text();

    // Clean up whitespace and newlines
    textContent = textContent.replace(/\s\s+/g, " ").trim();

    // 4. Fallback if primary selectors fail
    if (textContent.length < 200) {
      const description =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content");

      if (description) {
        textContent = description;
      } else if (textContent.length < 100) {
        // As a last resort, just use the body text, but it might be noisy
        textContent = $("body").text().replace(/\s\s+/g, " ").trim();
      }
    }

    if (!title || !textContent) {
      throw new Error(
        "Could not find required content (title or text) at that URL."
      );
    }

    return {
      title,
      imageUrl,
      textContent: textContent,
    };
  } catch (error) {
    console.error("Error in scrapeUrl:", error);
    throw new Error("Failed to scrape the provided URL.");
  }
}
