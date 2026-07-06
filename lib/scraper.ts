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
    let textContent = $("article").text() || $("main").text() || $("#wiki-content-block").text() || $(".mw-parser-output").text();

    if (!textContent || textContent.trim().length < 500) {
      // Remove noisy elements before grabbing body text
      $("script").remove();
      $("style").remove();
      $("nav").remove();
      $("footer").remove();
      $("header").remove();
      $("iframe").remove();
      $("[role='navigation']").remove();
      
      textContent = $("body").text();
    }

    // Clean up whitespace and newlines
    textContent = textContent.replace(/\s\s+/g, " ").trim();

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
