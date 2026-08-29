// lib/scraper.ts
import * as cheerio from "cheerio";

interface ScrapedData {
  title: string;
  imageUrl: string | null;
  textContent: string;
}

export type ScrapeErrorCode =
  | "invalid_url"
  | "blocked"
  | "not_found"
  | "timeout"
  | "unreachable"
  | "not_html"
  | "no_content"
  | "server_error";

// Carries a machine-readable reason plus a message that's safe to show the
// user, so the API can explain *why* a URL failed instead of collapsing every
// failure into one generic string.
export class ScrapeError extends Error {
  // Declared explicitly rather than as constructor parameter properties, which
  // are TS-only syntax that plain type-stripping runtimes can't execute.
  code: ScrapeErrorCode;
  status?: number;

  constructor(message: string, code: ScrapeErrorCode, status?: number) {
    super(message);
    this.name = "ScrapeError";
    this.code = code;
    this.status = status;
  }
}

const REQUEST_TIMEOUT_MS = 15_000;

// Sites routinely reject requests that don't look like a browser. The previous
// value here was a Chrome 58 string from 2017, which is old enough to be an
// obvious bot signal on its own; real browsers also always send Accept and
// Accept-Language, so we send those too. Refresh this occasionally.
//
// Note: this only gets us past naive filtering. Sites behind a serious bot
// wall, a paywall, or a login will still refuse, and that's expected —
// we surface it as a clear "blocked" error rather than pretending otherwise.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// ---------------------------------------------------------------------------
// MediaWiki support
//
// Fandom (and some other wikis) sit behind Cloudflare, which returns 403 to
// server-side fetches no matter what headers we send. They do, however, expose
// MediaWiki's public api.php, which is built for programmatic reads and is not
// gated — so for these hosts we ask the API for the page instead of scraping
// the protected HTML. This is the site's own supported interface, and it
// returns cleaner content than the rendered page anyway.
// ---------------------------------------------------------------------------

const MEDIAWIKI_HOSTS =
  /(^|\.)(fandom\.com|wikia\.org|wikipedia\.org|wikimedia\.org|wiktionary\.org|wikivoyage\.org|wikibooks\.org)$/i;

function mediaWikiTargetFor(
  parsed: URL,
): { apis: string[]; page: string } | null {
  if (!MEDIAWIKI_HOSTS.test(parsed.hostname)) return null;
  const match = parsed.pathname.match(/\/wiki\/(.+)$/);
  if (!match) return null;

  let page: string;
  try {
    page = decodeURIComponent(match[1]);
  } catch {
    page = match[1];
  }

  // The script path differs by installation: Wikimedia sites serve the API from
  // /w/api.php, Fandom from /api.php. Try both rather than hardcoding one.
  return {
    apis: [`${parsed.origin}/w/api.php`, `${parsed.origin}/api.php`],
    page,
  };
}

// Only the fields we actually read from action=parse.
interface MediaWikiParseResponse {
  error?: { code?: string };
  parse?: {
    title?: string;
    // formatversion=2 returns a string; older responses nest it under ["*"].
    text?: string | { "*"?: string };
  };
}

// Returns null (rather than throwing) so the caller can fall back to a normal
// HTML fetch if the API isn't available or the shape is unexpected.
async function scrapeViaMediaWiki(
  api: string,
  page: string,
): Promise<ScrapedData | null> {
  const url =
    `${api}?action=parse&page=${encodeURIComponent(page)}` +
    `&prop=text|displaytitle&redirects=1&format=json&formatversion=2`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, Accept: "application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let data: MediaWikiParseResponse;
  try {
    data = (await res.json()) as MediaWikiParseResponse;
  } catch {
    return null;
  }
  // A definitive "no such page" from the wiki itself. Report it as-is rather
  // than falling through to the HTML fetch, which on Cloudflare-fronted wikis
  // 403s and would misreport a missing page as "blocked".
  if (data?.error?.code === "missingtitle" || data?.error?.code === "invalidtitle") {
    throw new ScrapeError(
      "That wiki page doesn't exist. Double-check the page name.",
      "not_found",
      404,
    );
  }
  if (data?.error || !data?.parse) return null;

  // formatversion=2 gives a string; older responses nest it under ["*"].
  const rawText = data.parse.text;
  const html = typeof rawText === "string" ? rawText : rawText?.["*"];
  if (!html) return null;

  const $ = cheerio.load(html);

  // Strip wiki furniture that isn't article prose.
  $("script, style, table, .navbox, .infobox, .toc, .reference, .mw-editsection, .mw-references-wrap, .noprint, sup").remove();

  const textContent = $.root().text().replace(/\s\s+/g, " ").trim();
  if (!textContent) return null;

  const title: string = data.parse.title || page.replace(/_/g, " ");

  // First content image, if any. MediaWiki serves protocol-relative URLs.
  let imageUrl = $("img").first().attr("src") || null;
  if (imageUrl?.startsWith("//")) imageUrl = `https:${imageUrl}`;

  return { title, imageUrl, textContent };
}

function messageForStatus(status: number, statusText: string): ScrapeError {
  if (status === 401 || status === 403) {
    return new ScrapeError(
      "That site refused our request. It likely blocks automated readers, or the page needs a login.",
      "blocked",
      status,
    );
  }
  if (status === 404 || status === 410) {
    return new ScrapeError(
      "That page couldn't be found. Double-check the URL.",
      "not_found",
      status,
    );
  }
  if (status === 429) {
    return new ScrapeError(
      "That site is rate-limiting us right now. Try again in a little while.",
      "blocked",
      status,
    );
  }
  if (status >= 500) {
    return new ScrapeError(
      "That site is having problems right now. Try again later.",
      "server_error",
      status,
    );
  }
  return new ScrapeError(
    `That site returned an error (${status} ${statusText}).`,
    "unreachable",
    status,
  );
}

/**
 * Scrapes a given URL for its title, main image, and article text.
 * @param url The URL of the page to scrape.
 * @returns A promise that resolves to an object with { title, imageUrl, textContent }.
 * @throws {ScrapeError} with a `code` describing why it failed.
 */
export async function scrapeUrl(url: string): Promise<ScrapedData> {
  // Only ever fetch http(s). Without this, a user-supplied string could point
  // at file:// or another internal scheme on the server.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ScrapeError("That doesn't look like a valid URL.", "invalid_url");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ScrapeError(
      "Only http and https links can be saved.",
      "invalid_url",
    );
  }

  // Wikis: use the site's public MediaWiki API. Their HTML is often behind
  // Cloudflare and returns 403 to any server-side fetch, while api.php is the
  // supported read interface. Falls through to normal scraping if it fails.
  const wiki = mediaWikiTargetFor(parsed);
  if (wiki) {
    for (const api of wiki.apis) {
      const viaApi = await scrapeViaMediaWiki(api, wiki.page);
      if (viaApi) return viaApi;
    }
  }

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    // Network-level failure: DNS, TLS, connection refused, or our own timeout.
    const name = (error as Error)?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new ScrapeError(
        "That site took too long to respond.",
        "timeout",
      );
    }
    console.error("Error fetching URL:", error);
    throw new ScrapeError(
      "We couldn't reach that site. Check the URL and try again.",
      "unreachable",
    );
  }

  if (!response.ok) {
    throw messageForStatus(response.status, response.statusText);
  }

  // Guard against PDFs, images and other non-HTML: cheerio would happily parse
  // them into meaningless text.
  const contentType = response.headers.get("content-type") || "";
  if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    throw new ScrapeError(
      "That link isn't a web page we can read (only HTML pages are supported).",
      "not_html",
    );
  }

  try {
    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Scrape the metadata
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").first().text() ||
      $("h1").first().text();

    const imageUrl = $('meta[property="og:image"]').attr("content") || null;

    // 2. Scrape the main content
    // Try common article containers first
    let textContent =
      $("article").text() ||
      $("main").text() ||
      $("#wiki-content-block").text() ||
      $(".mw-parser-output").text();

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
      throw new ScrapeError(
        "We couldn't find any readable content on that page. It may be rendered entirely by JavaScript.",
        "no_content",
      );
    }

    return { title, imageUrl, textContent };
  } catch (error) {
    if (error instanceof ScrapeError) throw error;
    console.error("Error parsing page:", error);
    throw new ScrapeError(
      "We couldn't read that page's content.",
      "no_content",
    );
  }
}
