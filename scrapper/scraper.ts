import { chromium, type Page, type BrowserContext } from "playwright";

// Configuration
const DATASETS = [
  { id: 9, baseUrl: "https://www.justice.gov/epstein/doj-disclosures/data-set-9-files", estimatedPages: 10002 },
  { id: 10, baseUrl: "https://www.justice.gov/epstein/doj-disclosures/data-set-10-files", estimatedPages: 10000 },
  { id: 11, baseUrl: "https://www.justice.gov/epstein/doj-disclosures/data-set-11-files", estimatedPages: 1000 },
];

const BASE_URL = "https://www.justice.gov";
const DEFAULT_CONCURRENCY = 5; // Number of parallel page fetches
const STAGGER_DELAY_MS = 100; // Small delay between starting parallel requests

interface Mp4File {
  filename: string;
  url: string;
  sourcePageUrl?: string; // URL of the page where this file was found (optional for backwards compatibility)
}

interface DatasetResult {
  datasetId: number;
  totalPages: number;
  scrapedAt: string;
  mp4Files: Mp4File[];
}

interface ProgressData {
  datasetId: number;
  completedPages: number[]; // Track each successfully fetched page
  failedPages: number[]; // Track pages that failed (for retry)
  totalPagesToFetch: number;
  mp4Files: Mp4File[];
  lastUpdated: string;
}

interface PageResult {
  pageNum: number;
  mp4Files: Mp4File[];
  success: boolean;
  error?: string;
}

// Parse command line arguments
function parseArgs(): {
  dataset?: number;
  headless: boolean;
  maxPages?: number;
  concurrency: number;
  retryFailed: boolean;
  clearProgress: boolean;
  sequential: boolean;
  debug: boolean;
} {
  const args = process.argv.slice(2);
  let dataset: number | undefined;
  let headless = true;
  let maxPages: number | undefined;
  let concurrency = DEFAULT_CONCURRENCY;
  let retryFailed = false;
  let clearProgress = false;
  let sequential = false;
  let debug = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dataset" && args[i + 1]) {
      dataset = parseInt(args[i + 1]!);
      i++;
    } else if (args[i] === "--visible") {
      headless = false;
    } else if (args[i] === "--max-pages" && args[i + 1]) {
      maxPages = parseInt(args[i + 1]!);
      i++;
    } else if (args[i] === "--concurrency" && args[i + 1]) {
      concurrency = parseInt(args[i + 1]!);
      i++;
    } else if (args[i] === "--retry-failed") {
      retryFailed = true;
    } else if (args[i] === "--clear-progress") {
      clearProgress = true;
    } else if (args[i] === "--sequential") {
      sequential = true;
    } else if (args[i] === "--debug") {
      debug = true;
    }
  }

  return { dataset, headless, maxPages, concurrency, retryFailed, clearProgress, sequential, debug };
}

// Handle "I'm not a robot" check (instant check, no waiting)
async function handleRobotCheck(page: Page): Promise<boolean> {
  try {
    const robotButton = page.locator('input[type="button"][value="I am not a robot"]');
    if (await robotButton.count() > 0) {
      console.log("\n  [Robot check - clicking]");
      await robotButton.first().click();
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => { });
      return true;
    }
  } catch { }
  return false;
}

// Handle age verification popup (instant check, no waiting)
async function handleAgeVerification(page: Page): Promise<boolean> {
  try {
    const button = page.locator('#age-button-yes');
    if (await button.count() > 0) {
      console.log("\n  [Age verification - clicking Yes]");
      await button.first().click();
      // Don't wait - the page updates in place
      return true;
    }
  } catch { }
  return false;
}

// Quick verification check - only if needed
async function handleAllVerifications(page: Page): Promise<void> {
  await handleRobotCheck(page);
  await handleAgeVerification(page);
}

// Check if access denied
async function isAccessDenied(page: Page): Promise<boolean> {
  try {
    const title = await page.title();
    return title.toLowerCase().includes("access denied");
  } catch {
    return false;
  }
}

// Extract MP4 links from page
async function extractMp4Links(page: Page, sourcePageUrl: string): Promise<Mp4File[]> {
  try {
    const links = await page.$$eval("a[href]", (anchors, baseUrl) => {
      return anchors
        .filter((a) => {
          const href = a.getAttribute("href")?.toLowerCase() || "";
          return href.endsWith(".mp4") || href.endsWith(".mov");
        })
        .map((a) => {
          const href = a.getAttribute("href") || "";
          const filename = a.textContent?.trim() || href.split("/").pop() || "";
          const url = href.startsWith("http") ? href : `${baseUrl}${href}`;
          return { filename, url };
        });
    }, BASE_URL);

    // Add source page URL to each file
    return links.map((link) => ({ ...link, sourcePageUrl }));
  } catch {
    return [];
  }
}

// Fetch a single page with timing
async function fetchPage(
  context: BrowserContext,
  baseUrl: string,
  pageNum: number,
  debug: boolean = false
): Promise<PageResult> {
  const timings: Record<string, number> = {};
  const time = (label: string) => {
    timings[label] = Date.now();
  };

  time("start");
  const page = await context.newPage();
  time("newPage");

  const url = pageNum === 0 ? baseUrl : `${baseUrl}?page=${pageNum}`;

  try {
    // Use "commit" for fastest response - we just need the HTML
    await page.goto(url, { waitUntil: "commit", timeout: 15000 });
    time("goto");

    // Quick check for verifications (usually not needed after first page)
    await handleAllVerifications(page);
    time("verification");

    if (await isAccessDenied(page)) {
      time("accessCheck");
      await page.close();
      time("close");

      if (debug) {
        console.log(`\n  [Page ${pageNum} timing] newPage:${timings.newPage! - timings.start!}ms, goto:${timings.goto! - timings.newPage!}ms, verify:${timings.verification! - timings.goto!}ms, accessCheck:${timings.accessCheck! - timings.verification!}ms, close:${timings.close! - timings.accessCheck!}ms`);
      }
      return { pageNum, mp4Files: [], success: false, error: "access_denied" };
    }
    time("accessCheck");

    const mp4Files = await extractMp4Links(page, url);
    time("extract");

    await page.close();
    time("close");

    if (debug) {
      console.log(`\n  [Page ${pageNum} timing] newPage:${timings.newPage! - timings.start!}ms, goto:${timings.goto! - timings.newPage!}ms, verify:${timings.verification! - timings.goto!}ms, accessCheck:${timings.accessCheck! - timings.verification!}ms, extract:${timings.extract! - timings.accessCheck!}ms, close:${timings.close! - timings.extract!}ms, TOTAL:${timings.close! - timings.start!}ms`);
    }

    return { pageNum, mp4Files, success: true };
  } catch (error) {
    await page.close().catch(() => { });
    return { pageNum, mp4Files: [], success: false, error: String(error) };
  }
}

// Sequential fetching by clicking through pages (optimized for speed)
async function fetchPagesSequential(
  context: BrowserContext,
  baseUrl: string,
  maxPages: number,
  completedPages: Set<number>,
  onProgress: (result: PageResult, pageNum: number, total: number) => void
): Promise<PageResult[]> {
  const results: PageResult[] = [];
  const page = await context.newPage();

  try {
    // Navigate to first page
    await page.goto(baseUrl, { waitUntil: "commit", timeout: 15000 });
    await handleAllVerifications(page);

    let currentPage = 0;

    while (currentPage < maxPages) {
      // Skip already completed pages
      if (completedPages.has(currentPage)) {
        const nextLink = page.locator('a:has-text("Next")');
        if (await nextLink.count() > 0) {
          await nextLink.first().click();
          await page.waitForLoadState("commit", { timeout: 10000 }).catch(() => { });
        }
        currentPage++;
        continue;
      }

      // Check for access denied
      if (await isAccessDenied(page)) {
        console.log(`\n  Access denied at page ${currentPage}, stopping.`);
        break;
      }

      // Extract MP4 links immediately
      const currentUrl = currentPage === 0 ? baseUrl : `${baseUrl}?page=${currentPage}`;
      const mp4Files = await extractMp4Links(page, currentUrl);
      const result: PageResult = { pageNum: currentPage, mp4Files, success: true };
      results.push(result);
      onProgress(result, currentPage, maxPages);

      // Click next immediately - no delays
      const nextLink = page.locator('a:has-text("Next")');
      if (await nextLink.count() > 0) {
        await nextLink.first().click();
        // Just wait for navigation to start, not full load
        await page.waitForLoadState("commit", { timeout: 10000 }).catch(() => { });
        // Quick check for age verification (it appears sometimes)
        await handleAgeVerification(page);
        currentPage++;
      } else {
        console.log(`\n  No "Next" link - reached last page (${currentPage})`);
        break;
      }
    }
  } catch (error) {
    console.log(`\n  Error: ${error}`);
  } finally {
    await page.close();
  }

  return results;
}

// Worker pool for parallel fetching - now accepts specific pages to fetch
async function fetchPagesParallel(
  context: BrowserContext,
  baseUrl: string,
  pagesToFetch: number[], // Specific pages to fetch (allows gaps)
  concurrency: number,
  onProgress: (result: PageResult, completed: number, total: number) => void,
  debug: boolean = false
): Promise<PageResult[]> {
  const results: PageResult[] = [];
  const total = pagesToFetch.length;
  let pageIndex = 0;
  let completed = 0;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 15;

  const inFlight = new Map<number, Promise<PageResult>>();

  const startNextPage = async () => {
    if (pageIndex < pagesToFetch.length && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
      const pageNum = pagesToFetch[pageIndex++]!;
      const promise = fetchPage(context, baseUrl, pageNum, debug).then((result) => {
        inFlight.delete(pageNum);
        return result;
      });
      inFlight.set(pageNum, promise);
    }
  };

  // Start initial batch with stagger delay to avoid overwhelming server
  for (let i = 0; i < Math.min(concurrency, total); i++) {
    startNextPage();
    if (i < concurrency - 1) {
      await new Promise((r) => setTimeout(r, STAGGER_DELAY_MS));
    }
  }

  // Process results as they complete
  while (inFlight.size > 0) {
    const result = await Promise.race(inFlight.values());
    results.push(result);
    completed++;

    if (result.success) {
      consecutiveErrors = 0;
    } else {
      consecutiveErrors++;
    }

    onProgress(result, completed, total);

    // Start next page immediately when one completes
    if (consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
      startNextPage();
    } else {
      console.log(`\n  Too many consecutive errors (${MAX_CONSECUTIVE_ERRORS}), stopping early...`);
      break;
    }
  }

  return results;
}

// Load progress from file
async function loadProgress(datasetId: number): Promise<ProgressData | null> {
  const progressFile = Bun.file(`progress-${datasetId}.json`);
  if (await progressFile.exists()) {
    try {
      return await progressFile.json();
    } catch { }
  }
  return null;
}

// Save progress
async function saveProgress(progress: ProgressData): Promise<void> {
  await Bun.write(`progress-${progress.datasetId}.json`, JSON.stringify(progress, null, 2));
}

// Save results
async function saveResults(result: DatasetResult): Promise<void> {
  await Bun.write(`data-set-${result.datasetId}.json`, JSON.stringify(result, null, 2));
}

// Find gaps/ranges in a list of page numbers
function findGaps(pages: number[], maxPage: number): { start: number; end: number }[] {
  if (pages.length === 0) return [];
  const pageSet = new Set(pages);
  const gaps: { start: number; end: number }[] = [];
  let gapStart: number | null = null;

  for (let i = 0; i < maxPage; i++) {
    if (pageSet.has(i)) {
      if (gapStart === null) {
        gapStart = i;
      }
    } else if (gapStart !== null) {
      gaps.push({ start: gapStart, end: i - 1 });
      gapStart = null;
    }
  }
  if (gapStart !== null) {
    gaps.push({ start: gapStart, end: pages[pages.length - 1]! });
  }
  return gaps;
}

// Format duration in human readable format
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Clear progress for a dataset
async function clearProgress(datasetId: number): Promise<void> {
  const progressFile = Bun.file(`progress-${datasetId}.json`);
  if (await progressFile.exists()) {
    await Bun.write(`progress-${datasetId}.json`, "");
    console.log(`  Cleared progress for dataset ${datasetId}`);
  }
}

// Warm up session - handle initial verifications quickly
async function warmupSession(context: BrowserContext, baseUrl: string): Promise<boolean> {
  console.log("  Warming up session...");
  const page = await context.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: "commit", timeout: 15000 });
    await handleRobotCheck(page);
    await handleAgeVerification(page);

    const denied = await isAccessDenied(page);
    await page.close();

    if (denied) {
      console.log("  Warmup failed - access denied");
      return false;
    }

    console.log("  Session ready");
    return true;
  } catch (error) {
    console.log(`  Warmup error: ${error}`);
    await page.close().catch(() => { });
    return false;
  }
}

// Scrape a single dataset
async function scrapeDataset(
  context: BrowserContext,
  dataset: (typeof DATASETS)[0],
  maxPages: number | undefined,
  concurrency: number,
  retryFailedOnly: boolean = false,
  shouldClearProgress: boolean = false,
  useSequential: boolean = false,
  debug: boolean = false
): Promise<DatasetResult> {
  const startTime = Date.now();
  console.log(`\nStarting scrape of Dataset ${dataset.id}...`);

  // Clear progress if requested
  if (shouldClearProgress) {
    await clearProgress(dataset.id);
  }

  // Warm up session first to handle verification and establish cookies
  const warmedUp = await warmupSession(context, dataset.baseUrl);
  if (!warmedUp) {
    console.log("  Warning: Session warmup failed, parallel fetching may not work");
  }

  // Small delay after warmup
  await new Promise((r) => setTimeout(r, 1000));

  // Load existing progress
  const progress = shouldClearProgress ? null : await loadProgress(dataset.id);
  const completedPages = new Set<number>(progress?.completedPages || []);
  const failedPages = new Set<number>(progress?.failedPages || []);
  let mp4Files: Mp4File[] = progress?.mp4Files || [];

  // Determine target page range
  const targetEndPage = maxPages ? Math.min(maxPages, dataset.estimatedPages) : dataset.estimatedPages;

  // Build list of pages that need to be fetched
  let pagesToFetch: number[] = [];

  if (retryFailedOnly) {
    // Only retry previously failed pages
    pagesToFetch = Array.from(failedPages).filter((p) => p < targetEndPage).sort((a, b) => a - b);
    console.log(`  Retry mode: ${pagesToFetch.length} failed pages to retry`);
  } else {
    // Fetch all pages that aren't completed yet
    for (let i = 0; i < targetEndPage; i++) {
      if (!completedPages.has(i)) {
        pagesToFetch.push(i);
      }
    }
  }

  if (progress && completedPages.size > 0) {
    console.log(`  Progress: ${completedPages.size} pages done, ${failedPages.size} failed, ${mp4Files.length} MP4s found`);
  }

  if (pagesToFetch.length === 0) {
    if (retryFailedOnly) {
      console.log(`  No failed pages to retry!`);
    } else {
      console.log(`  All ${targetEndPage} pages already completed!`);
    }
    const result: DatasetResult = {
      datasetId: dataset.id,
      totalPages: completedPages.size,
      scrapedAt: new Date().toISOString(),
      mp4Files,
    };
    // Always save results to ensure data-set file is up to date with progress
    await saveResults(result);
    return result;
  }

  // Show which pages need fetching
  const gaps = findGaps(pagesToFetch, targetEndPage);
  if (gaps.length > 0 && gaps.length <= 5) {
    console.log(`  Missing ranges: ${gaps.map((g) => g.start === g.end ? `${g.start}` : `${g.start}-${g.end}`).join(", ")}`);
  }

  let lastSaveTime = Date.now();
  let newPagesScraped = 0;
  let newFailedPages: number[] = [];
  let results: PageResult[];

  const progressCallback = (result: PageResult, current: number, total: number) => {
    const percent = ((current / total) * 100).toFixed(1);
    const mp4Count = result.mp4Files.length > 0 ? ` +${result.mp4Files.length} videos` : "";
    const status = result.success ? "OK" : `ERR:${result.error?.slice(0, 15)}`;

    // Update tracking
    if (result.success) {
      completedPages.add(result.pageNum);
      failedPages.delete(result.pageNum);
      mp4Files.push(...result.mp4Files);
      newPagesScraped++;
    } else {
      failedPages.add(result.pageNum);
      newFailedPages.push(result.pageNum);
    }

    // Progress line
    const totalCompleted = completedPages.size;
    process.stdout.write(
      `\r  Dataset ${dataset.id}: ${current + 1}/${total} (${percent}%) | Page ${result.pageNum}: ${status}${mp4Count} | Done: ${totalCompleted}/${targetEndPage} | MP4s: ${mp4Files.length}    `
    );

    // Save progress every 10 seconds (fire-and-forget, final save is awaited)
    if (Date.now() - lastSaveTime > 10000) {
      void saveProgress({
        datasetId: dataset.id,
        completedPages: Array.from(completedPages),
        failedPages: Array.from(failedPages),
        totalPagesToFetch: targetEndPage,
        mp4Files,
        lastUpdated: new Date().toISOString(),
      });
      lastSaveTime = Date.now();
    }
  };

  if (useSequential) {
    // Sequential mode: click through pages (slower but avoids bot detection)
    console.log(`  Fetching up to ${targetEndPage} pages sequentially (clicking through)`);
    results = await fetchPagesSequential(
      context,
      dataset.baseUrl,
      targetEndPage,
      completedPages,
      progressCallback
    );
  } else {
    // Parallel mode: fetch multiple pages at once
    console.log(`  Fetching ${pagesToFetch.length} pages with ${concurrency} parallel workers`);
    results = await fetchPagesParallel(
      context,
      dataset.baseUrl,
      pagesToFetch,
      concurrency,
      (result, completed, total) => progressCallback(result, completed - 1, total),
      debug
    );
  }


  // Final save of progress
  await saveProgress({
    datasetId: dataset.id,
    completedPages: Array.from(completedPages),
    failedPages: Array.from(failedPages),
    totalPagesToFetch: targetEndPage,
    mp4Files,
    lastUpdated: new Date().toISOString(),
  });

  const duration = Date.now() - startTime;
  const pagesPerSecond = newPagesScraped > 0 ? (newPagesScraped / (duration / 1000)).toFixed(2) : "0";

  console.log(`\n  This run: ${newPagesScraped} pages scraped, ${newFailedPages.length} failed`);
  console.log(`  Total: ${completedPages.size}/${targetEndPage} pages done, ${mp4Files.length} MP4 files found`);
  console.log(`  Duration: ${formatDuration(duration)} (${pagesPerSecond} pages/sec)`);

  if (newFailedPages.length > 0) {
    console.log(`  Failed pages saved for retry: ${newFailedPages.slice(0, 10).join(", ")}${newFailedPages.length > 10 ? "..." : ""}`);
  }

  const result: DatasetResult = {
    datasetId: dataset.id,
    totalPages: completedPages.size,
    scrapedAt: new Date().toISOString(),
    mp4Files,
  };

  await saveResults(result);

  return result;
}

// Main function
async function main() {
  const { dataset, headless, maxPages, concurrency, retryFailed, clearProgress: shouldClear, sequential, debug } = parseArgs();
  const totalStartTime = Date.now();

  console.log("DOJ Epstein Files MP4 Scraper");
  console.log("=============================");
  console.log(`Mode: ${headless ? "headless" : "visible"}`);
  if (sequential) {
    console.log(`Fetch mode: Sequential (clicking through pages)`);
  } else {
    console.log(`Fetch mode: Parallel (${concurrency} workers)`);
  }
  if (maxPages) console.log(`Max pages per dataset: ${maxPages}`);
  if (dataset) console.log(`Target dataset: ${dataset}`);
  if (retryFailed) console.log(`Mode: Retry failed pages only`);
  if (shouldClear) console.log(`Mode: Starting fresh (clearing progress)`);
  if (debug) console.log(`Debug: Timing enabled`);

  const browser = await chromium.launch({ headless });

  // Create context with realistic browser settings
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
  });

  try {
    const datasetsToScrape = dataset ? DATASETS.filter((d) => d.id === dataset) : DATASETS;

    if (datasetsToScrape.length === 0) {
      console.error(`Dataset ${dataset} not found. Available: 9, 10, 11`);
      process.exit(1);
    }

    const results: DatasetResult[] = [];

    for (const ds of datasetsToScrape) {
      const result = await scrapeDataset(context, ds, maxPages, concurrency, retryFailed, shouldClear, sequential, debug);
      results.push(result);
    }

    const totalDuration = Date.now() - totalStartTime;
    const totalPages = results.reduce((sum, r) => sum + r.totalPages, 0);
    const totalFiles = results.reduce((sum, r) => sum + r.mp4Files.length, 0);

    console.log("\n=============================");
    console.log("SCRAPING COMPLETE");
    console.log("=============================");
    for (const result of results) {
      console.log(`Dataset ${result.datasetId}: ${result.mp4Files.length} video files from ${result.totalPages} pages`);
    }
    console.log(`\nTotal: ${totalFiles} MP4 files from ${totalPages} pages`);
    console.log(`Total time: ${formatDuration(totalDuration)}`);
    console.log(`\nResults saved to: data-set-{9,10,11}.json`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(console.error);
