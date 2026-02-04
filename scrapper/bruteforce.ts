import { chromium, type Page, type BrowserContext } from "playwright";

// Configuration
const DEFAULT_CONCURRENCY = 10;
const DATASET_URLS: Record<number, string> = {
  9: "https://www.justice.gov/epstein/files/DataSet%209",
  10: "https://www.justice.gov/epstein/files/DataSet%2010",
};

interface Mp4File {
  filename: string;
  url: string;
}

interface BruteforceProgress {
  dataset: number;
  startNum: number;
  endNum: number;
  currentNum: number;
  foundFiles: Mp4File[];
  checkedCount: number;
  notFoundCount: number;
  lastUpdated: string;
}

interface CheckResult {
  num: number;
  found: boolean;
  url: string;
}

// Parse command line arguments
function parseArgs(): {
  dataset: number;
  startNum: number;
  endNum: number;
  centerNum?: number;
  concurrency: number;
  headless: boolean;
  resume: boolean;
} {
  const args = process.argv.slice(2);
  let dataset = 9;
  let startNum = 0;
  let endNum = 2000000;
  let centerNum: number | undefined;
  let concurrency = DEFAULT_CONCURRENCY;
  let headless = true;
  let resume = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === "--dataset" && nextArg) {
      dataset = parseInt(nextArg);
      i++;
    } else if (arg === "--start" && nextArg) {
      startNum = parseInt(nextArg);
      i++;
    } else if (arg === "--end" && nextArg) {
      endNum = parseInt(nextArg);
      i++;
    } else if (arg === "--center" && nextArg) {
      // Accept either raw number or EFTA format
      const match = nextArg.match(/EFTA0*(\d+)/i);
      if (match) {
        centerNum = parseInt(match[1]);
      } else {
        centerNum = parseInt(nextArg);
      }
      i++;
    } else if (arg === "--concurrency" && nextArg) {
      concurrency = parseInt(nextArg);
      i++;
    } else if (arg === "--visible") {
      headless = false;
    } else if (arg === "--resume") {
      resume = true;
    }
  }

  if (!DATASET_URLS[dataset]) {
    console.log(`
Bruteforce MP4 Scanner for DOJ Epstein Files
=============================================

Usage: bun bruteforce.ts [options]

Options:
  --dataset <9|10>        Dataset to scan (default: 9)
  --start <number>        Start number for linear scan (default: 0)
  --end <number>          End number for linear scan (default: 2000000)
  --center <number|EFTA>  Center number to expand from (e.g., 1622053 or EFTA01622053)
  --concurrency <number>  Parallel requests (default: ${DEFAULT_CONCURRENCY})
  --visible               Show browser window
  --resume                Resume from previous progress

Scan Modes:
  Linear:   --start 64000 --end 100000    (scans 64000, 64001, 64002, ...)
  Outward:  --center 1622053              (scans 1622053, then 1622052 & 1622054, then 1622051 & 1622055, ...)

Examples:
  # Linear scan
  bun bruteforce.ts --dataset 9 --start 64000 --end 100000

  # Outward scan from a center point
  bun bruteforce.ts --dataset 9 --center EFTA01622053 --concurrency 20
  bun bruteforce.ts --dataset 10 --center 1650000 --start 1600000 --end 1700000

  # Resume previous scan
  bun bruteforce.ts --dataset 9 --resume
`);
    process.exit(1);
  }

  return { dataset, startNum, endNum, centerNum, concurrency, headless, resume };
}

// Video extensions to check
const VIDEO_EXTENSIONS = [".mp4", ".mov"];

// Format number as EFTA filename
function formatFilename(num: number, ext: string = ".mp4"): string {
  return `EFTA${num.toString().padStart(8, "0")}${ext}`;
}

// Generate numbers expanding outward from a center point
function generateOutwardNumbers(
  center: number,
  minBound: number,
  maxBound: number
): number[] {
  const numbers: number[] = [center];
  let offset = 1;

  // Expand outward until we hit both bounds
  while (true) {
    const lower = center - offset;
    const upper = center + offset;

    const lowerValid = lower >= minBound;
    const upperValid = upper <= maxBound;

    if (!lowerValid && !upperValid) break;

    if (lowerValid) numbers.push(lower);
    if (upperValid) numbers.push(upper);

    offset++;
  }

  return numbers;
}

// Load existing files from datasets to know what we already have
async function loadExistingFiles(dataset: number): Promise<Set<string>> {
  const existing = new Set<string>();

  try {
    const file = Bun.file(`data-set-${dataset}.json`);
    if (await file.exists()) {
      const data = await file.json();
      for (const video of data.mp4Files) {
        // Match both .mp4 and .mov files
        const match = video.filename.match(/EFTA0*(\d+)\.(mp4|mov)/i);
        if (match) {
          // Store as "number:ext" to track which extension we already have
          existing.add(`${match[1]}:${match[2].toLowerCase()}`);
        }
      }
      console.log(`  Loaded ${existing.size} existing files from data-set-${dataset}.json`);
    }
  } catch (error) {
    console.log(`  Warning: Could not load data-set-${dataset}.json: ${error}`);
  }

  return existing;
}

// Load progress
async function loadProgress(dataset: number): Promise<BruteforceProgress | null> {
  const file = Bun.file(`bruteforce-${dataset}-progress.json`);
  if (await file.exists()) {
    try {
      return await file.json();
    } catch {
      return null;
    }
  }
  return null;
}

// Save progress
async function saveProgress(progress: BruteforceProgress): Promise<void> {
  await Bun.write(
    `bruteforce-${progress.dataset}-progress.json`,
    JSON.stringify(progress, null, 2)
  );
}

// Save found files
async function saveFoundFiles(dataset: number, files: Mp4File[]): Promise<void> {
  await Bun.write(
    `bruteforce-${dataset}-found.json`,
    JSON.stringify({ dataset, foundAt: new Date().toISOString(), files }, null, 2)
  );
}

// Handle robot check
async function handleRobotCheck(page: Page): Promise<boolean> {
  try {
    const robotButton = page.locator('input[type="button"][value="I am not a robot"]');
    if ((await robotButton.count()) > 0) {
      console.log("\n  [Robot check - clicking]");
      await robotButton.first().click();
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => { });
      return true;
    }
  } catch { }
  return false;
}

// Handle age verification
async function handleAgeVerification(page: Page): Promise<boolean> {
  try {
    const button = page.locator("#age-button-yes");
    if ((await button.count()) > 0) {
      console.log("\n  [Age verification - clicking Yes]");
      await button.first().click();
      return true;
    }
  } catch { }
  return false;
}

// Handle all verifications
async function handleAllVerifications(page: Page): Promise<void> {
  await handleRobotCheck(page);
  await handleAgeVerification(page);
}

// Check a single URL using fetch with cookies
async function checkUrl(
  url: string,
  cookieHeader: string
): Promise<{ found: boolean; status: number }> {
  try {
    // Use HEAD request with no compression to avoid decompression issues
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        Cookie: cookieHeader === "none" ? "" : cookieHeader,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Encoding": "identity", // Disable compression
      },
      redirect: "follow",
    });

    // 200 = found, 404 = not found
    const found = response.status === 200;

    // Check content-type to make sure it's not HTML (verification page)
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      return { found: false, status: response.status };
    }

    return { found, status: response.status };
  } catch (error) {
    // Ignore decompression errors, treat as not found
    return { found: false, status: 0 };
  }
}

// Establish session and get cookies
async function establishSession(
  context: BrowserContext,
  dataset: number
): Promise<string> {
  console.log("  Establishing session...");
  const page = await context.newPage();

  try {
    // Go to a known file URL to trigger verification
    const baseUrl = DATASET_URLS[dataset];
    // Try a likely existing URL first
    await page.goto(`${baseUrl}/EFTA00064598.mp4`, {
      waitUntil: "commit",
      timeout: 15000,
    });

    // Handle verifications
    await handleAllVerifications(page);

    // Wait a moment for cookies to be set
    await page.waitForTimeout(1000);

    // Get cookies
    const cookies = await context.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    await page.close();

    if (cookies.length > 0) {
      console.log(`  Session established (${cookies.length} cookies)`);
    } else {
      console.log("  Session established (no cookies, will try anyway)");
    }

    return cookieHeader || "none"; // Return non-empty to pass the check
  } catch (error) {
    console.log(`  Session error: ${error}`);
    await page.close().catch(() => { });
    return "";
  }
}

// Worker pool for parallel checking (checks both .mp4 and .mov for each number)
async function checkNumbersParallel(
  numbersToCheck: number[],
  dataset: number,
  cookieHeader: string,
  concurrency: number,
  existingFiles: Set<string>,
  onProgress: (result: CheckResult, completed: number, total: number) => void
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const baseUrl = DATASET_URLS[dataset];

  // Build list of all URLs to check (number + extension combinations)
  const urlsToCheck: { num: number; ext: string; url: string }[] = [];
  for (const num of numbersToCheck) {
    for (const ext of VIDEO_EXTENSIONS) {
      const key = `${num}:${ext.slice(1)}`; // e.g., "1622053:mp4"
      if (!existingFiles.has(key)) {
        const filename = formatFilename(num, ext);
        urlsToCheck.push({ num, ext, url: `${baseUrl}/${filename}` });
      }
    }
  }

  const total = urlsToCheck.length;
  let index = 0;
  let completed = 0;

  const inFlight = new Map<string, Promise<CheckResult>>();

  const startNext = () => {
    while (inFlight.size < concurrency && index < urlsToCheck.length) {
      const item = urlsToCheck[index++]!;
      const key = `${item.num}:${item.ext}`;

      const promise = checkUrl(item.url, cookieHeader).then((result) => {
        inFlight.delete(key);
        return { num: item.num, found: result.found, url: item.url };
      });

      inFlight.set(key, promise);
    }
  };

  // Start initial batch
  startNext();

  // Process results as they complete
  while (inFlight.size > 0) {
    const result = await Promise.race(inFlight.values());
    results.push(result);
    completed++;

    onProgress(result, completed, total);
    startNext();
  }

  return results;
}

// Format duration
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

// Main function
async function main() {
  const { dataset, startNum, endNum, centerNum, concurrency, headless, resume } = parseArgs();
  const startTime = Date.now();

  console.log("Bruteforce MP4 Scanner for DOJ Epstein Files");
  console.log("=============================================");
  console.log(`Dataset: ${dataset}`);
  if (centerNum !== undefined) {
    console.log(`Mode: Outward from ${formatFilename(centerNum)}`);
    console.log(`Bounds: ${startNum} to ${endNum}`);
  } else {
    console.log(`Mode: Linear scan`);
    console.log(`Range: ${startNum} to ${endNum}`);
  }
  console.log(`Concurrency: ${concurrency}`);

  // Load existing files
  const existingFiles = await loadExistingFiles(dataset);

  // Load or initialize progress
  let progress: BruteforceProgress;
  if (resume) {
    const savedProgress = await loadProgress(dataset);
    if (savedProgress) {
      progress = savedProgress;
      console.log(`  Resuming from ${progress.currentNum} (${progress.foundFiles.length} found so far)`);
    } else {
      console.log("  No previous progress found, starting fresh");
      progress = {
        dataset,
        startNum,
        endNum,
        currentNum: centerNum ?? startNum,
        foundFiles: [],
        checkedCount: 0,
        notFoundCount: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  } else {
    progress = {
      dataset,
      startNum,
      endNum,
      currentNum: centerNum ?? startNum,
      foundFiles: [],
      checkedCount: 0,
      notFoundCount: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Build list of numbers to check
  let numbersToCheck: number[];
  if (centerNum !== undefined) {
    // Outward expansion mode
    numbersToCheck = generateOutwardNumbers(centerNum, startNum, endNum).filter(
      (n) => !existingFiles.has(n)
    );
  } else {
    // Linear mode
    numbersToCheck = [];
    for (let i = progress.currentNum; i <= endNum; i++) {
      if (!existingFiles.has(i)) {
        numbersToCheck.push(i);
      }
    }
  }

  console.log(`  Numbers to check: ${numbersToCheck.length}`);

  if (numbersToCheck.length === 0) {
    console.log("\nNo numbers to check!");
    return;
  }

  // Launch browser
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  try {
    // Establish session
    const cookieHeader = await establishSession(context, dataset);

    if (!cookieHeader) {
      console.log("  Failed to establish session, exiting");
      return;
    }

    let lastSaveTime = Date.now();
    let foundCount = progress.foundFiles.length;
    let checkedCount = progress.checkedCount;

    const progressCallback = (result: CheckResult, completed: number, total: number) => {
      checkedCount++;
      progress.currentNum = result.num;
      progress.checkedCount = checkedCount;

      if (result.found) {
        foundCount++;
        progress.foundFiles.push({
          filename: result.url.split("/").pop() || formatFilename(result.num),
          url: result.url,
        });
        console.log(`\n  FOUND: ${result.url.split("/").pop()}`);
      } else {
        progress.notFoundCount++;
      }

      const percent = ((completed / total) * 100).toFixed(2);
      const rate = checkedCount / ((Date.now() - startTime) / 1000);
      process.stdout.write(
        `\r  Progress: ${completed}/${total} (${percent}%) | Checked: ${checkedCount} | Found: ${foundCount} | Rate: ${rate.toFixed(1)}/s    `
      );

      // Save progress every 3 seconds
      if (Date.now() - lastSaveTime > 3000) {
        progress.lastUpdated = new Date().toISOString();
        void saveProgress(progress);
        void saveFoundFiles(dataset, progress.foundFiles);
        lastSaveTime = Date.now();
      }
    };

    // Run the parallel checker
    await checkNumbersParallel(
      numbersToCheck,
      dataset,
      cookieHeader,
      concurrency,
      existingFiles,
      progressCallback
    );

    // Final save
    progress.lastUpdated = new Date().toISOString();
    await saveProgress(progress);
    await saveFoundFiles(dataset, progress.foundFiles);

    const duration = Date.now() - startTime;

    console.log("\n\n=============================================");
    console.log("SCAN COMPLETE");
    console.log("=============================================");
    console.log(`Checked: ${checkedCount} URLs`);
    console.log(`Found: ${foundCount} new files`);
    console.log(`Duration: ${formatDuration(duration)}`);
    console.log(`Rate: ${(checkedCount / (duration / 1000)).toFixed(1)} checks/sec`);
    console.log(`\nResults saved to: bruteforce-${dataset}-found.json`);

    if (progress.foundFiles.length > 0) {
      console.log(`\nFound files:`);
      for (const f of progress.foundFiles.slice(0, 10)) {
        console.log(`  ${f.filename}`);
      }
      if (progress.foundFiles.length > 10) {
        console.log(`  ... and ${progress.foundFiles.length - 10} more`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(console.error);
