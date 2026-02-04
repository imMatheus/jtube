import { chromium, type Page, type BrowserContext } from "playwright";

// Configuration
const DEFAULT_CONCURRENCY = 2; // Lower concurrency for downloads
const MAX_FILE_SIZE_MB = 5_000; // Skip files larger than this (in MB)
// const DISREGARD_FILES_PATH = "./disregard-files.json";

interface DisregardFile {
  id: string;
  title: string;
  filename: string;
  length: string;
}

interface Mp4File {
  filename: string;
  url: string;
  sourcePageUrl?: string;
}

interface DatasetFile {
  datasetId: number;
  totalPages: number;
  scrapedAt: string;
  mp4Files: Mp4File[];
}

interface DownloadProgress {
  datasetId: number;
  totalFiles: number;
  completedFiles: string[]; // filenames
  failedFiles: { filename: string; error: string; url: string }[];
  skippedFiles: { filename: string; reason: string; url: string }[];
  lastUpdated: string;
}

interface DownloadResult {
  filename: string;
  url: string;
  success: boolean;
  skipped?: boolean;
  error?: string;
  size?: number;
  skipReason?: string;
}

// Parse command line arguments
function parseArgs(): {
  datasetFile: string;
  outputDir: string;
  maxDownloads?: number;
  concurrency: number;
  maxSizeMb: number;
  retryFailed: boolean;
  clearProgress: boolean;
  headless: boolean;
  startFrom?: number;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  let datasetFile = "";
  let outputDir = "./downloads";
  let maxDownloads: number | undefined;
  let concurrency = DEFAULT_CONCURRENCY;
  let maxSizeMb = MAX_FILE_SIZE_MB;
  let retryFailed = false;
  let clearProgress = false;
  let headless = true;
  let startFrom: number | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === "--dataset" && nextArg) {
      datasetFile = nextArg;
      i++;
    } else if (arg === "--output" && nextArg) {
      outputDir = nextArg;
      i++;
    } else if (arg === "--max" && nextArg) {
      maxDownloads = parseInt(nextArg);
      i++;
    } else if (arg === "--concurrency" && nextArg) {
      concurrency = parseInt(nextArg);
      i++;
    } else if (arg === "--max-size" && nextArg) {
      maxSizeMb = parseInt(nextArg);
      i++;
    } else if (arg === "--retry-failed") {
      retryFailed = true;
    } else if (arg === "--clear-progress") {
      clearProgress = true;
    } else if (arg === "--visible") {
      headless = false;
    } else if (arg === "--start-from" && nextArg) {
      startFrom = parseInt(nextArg);
      i++;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (!arg?.startsWith("--") && !datasetFile) {
      datasetFile = arg!;
    }
  }

  if (!datasetFile) {
    console.log(`
Video Downloader for DOJ Epstein Files
=======================================

Usage: bun downloader.ts <dataset-file> [options]

Arguments:
  <dataset-file>          Path to the dataset JSON file (e.g., data-set-10.json)

Options:
  --output <dir>          Output directory for downloads (default: ./downloads)
  --max <number>          Maximum number of files to download
  --concurrency <number>  Number of parallel downloads (default: ${DEFAULT_CONCURRENCY})
  --max-size <mb>         Skip files larger than this size in MB (default: ${MAX_FILE_SIZE_MB})
  --start-from <index>    Start from a specific index in the file list
  --retry-failed          Only retry previously failed downloads
  --clear-progress        Start fresh, clearing all progress
  --visible               Show browser window (for debugging)
  --dry-run               Show what would be downloaded without downloading

Examples:
  bun downloader.ts data-set-10.json
  bun downloader.ts data-set-10.json --max 100 --concurrency 3
  bun downloader.ts data-set-10.json --retry-failed
  bun downloader.ts data-set-10.json --max-size 100 --output ./videos
`);
    process.exit(1);
  }

  return {
    datasetFile,
    outputDir,
    maxDownloads,
    concurrency,
    maxSizeMb,
    retryFailed,
    clearProgress,
    headless,
    startFrom,
    dryRun,
  };
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
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

// Load dataset file
async function loadDataset(filePath: string): Promise<DatasetFile> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`Dataset file not found: ${filePath}`);
  }
  return await file.json();
}

// Get progress file path from dataset file
function getProgressFilePath(datasetFile: string): string {
  const baseName = datasetFile.replace(/\.json$/, "");
  return `${baseName}-download-progress.json`;
}

// Load progress
async function loadProgress(datasetFile: string): Promise<DownloadProgress | null> {
  const progressFile = Bun.file(getProgressFilePath(datasetFile));
  if (await progressFile.exists()) {
    try {
      return await progressFile.json();
    } catch {
      return null;
    }
  }
  return null;
}

// Save progress
async function saveProgress(datasetFile: string, progress: DownloadProgress): Promise<void> {
  await Bun.write(getProgressFilePath(datasetFile), JSON.stringify(progress, null, 2));
}

// Ensure output directory exists
async function ensureDir(dir: string): Promise<void> {
  try {
    await Bun.$`mkdir -p ${dir}`.quiet();
  } catch {
    // Directory might already exist
  }
}

// Load disregard files list (files already downloaded elsewhere)
// async function loadDisregardFiles(): Promise<Set<string>> {
//   const file = Bun.file(DISREGARD_FILES_PATH);
//   if (!(await file.exists())) {
//     return new Set();
//   }
//   try {
//     const data: DisregardFile[] = await file.json();
//     // Create set of filenames (with .mp4 extension for matching)
//     const filenames = new Set<string>();
//     for (const item of data) {
//       filenames.add(`${item.filename}.mp4`);
//     }
//     return filenames;
//   } catch (error) {
//     console.log(`  Warning: Could not load disregard-files.json: ${error}`);
//     return new Set();
//   }
// }

// Handle "I'm not a robot" check (instant check, no waiting)
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

// Handle age verification popup (instant check, no waiting)
async function handleAgeVerification(page: Page): Promise<boolean> {
  try {
    const button = page.locator("#age-button-yes");
    if ((await button.count()) > 0) {
      console.log("\n  [Age verification - clicking Yes]");
      await button.first().click();
      // Don't wait - the page updates in place
      return true;
    }
  } catch { }
  return false;
}

// Quick verification check - only if needed (same as scraper.ts)
async function handleAllVerifications(page: Page): Promise<void> {
  await handleRobotCheck(page);
  await handleAgeVerification(page);
}

// Check if access denied
async function isAccessDenied(page: Page): Promise<boolean> {
  try {
    const title = await page.title();
    const content = await page.content();
    return (
      title.toLowerCase().includes("access denied") ||
      content.includes("Access Denied") ||
      content.includes("403 Forbidden")
    );
  } catch {
    return false;
  }
}

// Download a single file using browser for verification, handling both direct downloads and fetch
async function downloadFile(
  context: BrowserContext,
  file: Mp4File,
  outputDir: string,
  maxSizeMb: number
): Promise<DownloadResult> {
  const outputPath = `${outputDir}/${file.filename}`;

  // Check if file already exists locally
  const existingFile = Bun.file(outputPath);
  if (await existingFile.exists()) {
    const stats = await existingFile.stat();
    // Only skip if file is non-empty (not a failed HTML download)
    if (stats && stats.size > 1000) {
      return {
        filename: file.filename,
        url: file.url,
        success: true,
        skipped: true,
        skipReason: "already_exists",
        size: stats.size,
      };
    }
  }

  const page = await context.newPage();

  try {
    // Set up download handler - some URLs trigger immediate browser downloads
    let downloadPromise: Promise<import("playwright").Download> | null = null;
    page.on("download", (download) => {
      downloadPromise = Promise.resolve(download);
    });

    // Step 1: Navigate to file URL to trigger any verification pages
    // Use a try-catch because navigation might fail if download starts immediately
    try {
      await page.goto(file.url, { waitUntil: "commit", timeout: 30000 });
    } catch (navError) {
      // If navigation "failed" because a download started, that's OK
      const errorStr = String(navError);
      if (!errorStr.includes("Download") && !downloadPromise) {
        throw navError;
      }
    }

    // Step 2: Handle verifications (robot check, age verification)
    await handleAllVerifications(page);

    // Check for access denied
    if (await isAccessDenied(page)) {
      await page.close();
      return {
        filename: file.filename,
        url: file.url,
        success: false,
        error: "access_denied",
      };
    }

    // Step 3: Wait a moment for download to potentially start after verification
    await page.waitForTimeout(2000);

    // Check if a download was triggered by the browser
    if (downloadPromise) {
      const download = await downloadPromise;

      // Save the download to our output path
      await download.saveAs(outputPath);

      const savedFile = Bun.file(outputPath);
      const stats = await savedFile.stat();

      await page.close();

      return {
        filename: file.filename,
        url: file.url,
        success: true,
        size: stats?.size || 0,
      };
    }

    // Step 4: No browser download - try fetch method with cookies
    const cookies = await context.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    await page.close();

    const fetchResponse = await fetch(file.url, {
      headers: {
        Cookie: cookieHeader,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "video/mp4,video/*,*/*",
      },
      redirect: "follow",
    });

    if (!fetchResponse.ok) {
      return {
        filename: file.filename,
        url: file.url,
        success: false,
        error: `HTTP ${fetchResponse.status}`,
      };
    }

    const fetchContentType = fetchResponse.headers.get("content-type") || "";

    // If we got HTML, verification didn't work
    if (fetchContentType.includes("text/html")) {
      return {
        filename: file.filename,
        url: file.url,
        success: false,
        error: "session_not_established",
      };
    }

    // Check content-length for size limit before downloading
    const contentLength = fetchResponse.headers.get("content-length");
    if (contentLength) {
      const sizeMb = parseInt(contentLength) / (1024 * 1024);
      if (sizeMb > maxSizeMb) {
        return {
          filename: file.filename,
          url: file.url,
          success: true,
          skipped: true,
          skipReason: `size_too_large (${formatBytes(parseInt(contentLength))} > ${maxSizeMb}MB)`,
          size: parseInt(contentLength),
        };
      }
    }

    // Download the file
    const arrayBuffer = await fetchResponse.arrayBuffer();
    await Bun.write(outputPath, arrayBuffer);

    return {
      filename: file.filename,
      url: file.url,
      success: true,
      size: arrayBuffer.byteLength,
    };
  } catch (error) {
    await page.close().catch(() => { });
    return {
      filename: file.filename,
      url: file.url,
      success: false,
      error: String(error).slice(0, 100),
    };
  }
}
// Sequential download (more reliable for this site)
async function downloadFilesSequential(
  context: BrowserContext,
  files: Mp4File[],
  outputDir: string,
  maxSizeMb: number,
  onProgress: (result: DownloadResult, completed: number, total: number) => void
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];
  const total = files.length;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 10;

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;

    const result = await downloadFile(context, file, outputDir, maxSizeMb);
    results.push(result);

    if (result.success) {
      consecutiveErrors = 0;
    } else {
      consecutiveErrors++;
    }

    onProgress(result, i + 1, total);

    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.log(`\n  Too many consecutive errors (${MAX_CONSECUTIVE_ERRORS}), stopping...`);
      break;
    }

    // Small delay between downloads to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  return results;
}

// Parallel download worker pool
async function downloadFilesParallel(
  context: BrowserContext,
  files: Mp4File[],
  outputDir: string,
  concurrency: number,
  maxSizeMb: number,
  onProgress: (result: DownloadResult, completed: number, total: number) => void
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];
  const total = files.length;
  let fileIndex = 0;
  let completed = 0;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 10;

  const inFlight = new Map<string, Promise<DownloadResult>>();

  const startNextDownload = () => {
    if (fileIndex < files.length && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
      const file = files[fileIndex++]!;
      const promise = downloadFile(context, file, outputDir, maxSizeMb).then((r) => {
        inFlight.delete(file.filename);
        return r;
      });
      inFlight.set(file.filename, promise);
    }
  };

  // Start initial batch
  for (let i = 0; i < Math.min(concurrency, total); i++) {
    startNextDownload();
    await new Promise((r) => setTimeout(r, 200));
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

    if (consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
      startNextDownload();
    } else {
      console.log(`\n  Too many consecutive errors (${MAX_CONSECUTIVE_ERRORS}), stopping...`);
      break;
    }
  }

  return results;
}

// Main function
async function main() {
  const {
    datasetFile,
    outputDir,
    maxDownloads,
    concurrency,
    maxSizeMb,
    retryFailed,
    clearProgress: shouldClear,
    headless,
    startFrom,
    dryRun,
  } = parseArgs();

  const startTime = Date.now();

  console.log("Video Downloader for DOJ Epstein Files");
  console.log("======================================");
  console.log(`Dataset: ${datasetFile}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Max file size: ${maxSizeMb} MB`);
  if (maxDownloads) console.log(`Max downloads: ${maxDownloads}`);
  if (retryFailed) console.log(`Mode: Retry failed only`);
  if (shouldClear) console.log(`Mode: Starting fresh`);
  if (dryRun) console.log(`Mode: Dry run (no downloads)`);

  // Load dataset
  const dataset = await loadDataset(datasetFile);
  console.log(`\nDataset ${dataset.datasetId}: ${dataset.mp4Files.length} total files`);

  // Ensure output directory exists
  await ensureDir(outputDir);

  // Load or initialize progress
  let progress: DownloadProgress;
  if (shouldClear) {
    progress = {
      datasetId: dataset.datasetId,
      totalFiles: dataset.mp4Files.length,
      completedFiles: [],
      failedFiles: [],
      skippedFiles: [],
      lastUpdated: new Date().toISOString(),
    };
  } else {
    const existingProgress = await loadProgress(datasetFile);
    progress = existingProgress || {
      datasetId: dataset.datasetId,
      totalFiles: dataset.mp4Files.length,
      completedFiles: [],
      failedFiles: [],
      skippedFiles: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Load disregard files (already downloaded elsewhere)
  // const disregardFiles = await loadDisregardFiles();
  // if (disregardFiles.size > 0) {
  //   console.log(`Disregard list: ${disregardFiles.size} files to skip`);
  // }

  // Determine which files to download
  const completedSet = new Set(progress.completedFiles);
  const skippedSet = new Set(progress.skippedFiles.map((f) => f.filename));

  let filesToDownload: Mp4File[];

  if (retryFailed) {
    const failedFilenames = new Set(progress.failedFiles.map((f) => f.filename));
    filesToDownload = dataset.mp4Files.filter(
      (f) => failedFilenames.has(f.filename)
      // (f) => failedFilenames.has(f.filename) && !disregardFiles.has(f.filename)
    );
    console.log(`Retry mode: ${filesToDownload.length} failed files to retry`);
  } else {
    filesToDownload = dataset.mp4Files.filter(
      (f) => !completedSet.has(f.filename) && !skippedSet.has(f.filename)
    );
  }

  if (startFrom !== undefined && startFrom > 0) {
    filesToDownload = filesToDownload.slice(startFrom);
    console.log(`Starting from index ${startFrom}`);
  }

  if (maxDownloads !== undefined) {
    filesToDownload = filesToDownload.slice(0, maxDownloads);
  }

  console.log(`Progress: ${completedSet.size} done, ${progress.skippedFiles.length} skipped, ${progress.failedFiles.length} failed`);
  console.log(`Files to download: ${filesToDownload.length}`);

  if (filesToDownload.length === 0) {
    console.log("\nNo files to download!");
    return;
  }

  if (dryRun) {
    console.log("\nDry run - files that would be downloaded:");
    for (const file of filesToDownload.slice(0, 20)) {
      console.log(`  ${file.filename}`);
    }
    if (filesToDownload.length > 20) {
      console.log(`  ... and ${filesToDownload.length - 20} more`);
    }
    return;
  }

  // Launch browser
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
    acceptDownloads: true,
  });

  try {
    let lastSaveTime = Date.now();
    let downloadedCount = 0;
    let downloadedBytes = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const progressCallback = (result: DownloadResult, completed: number, total: number) => {
      const percent = ((completed / total) * 100).toFixed(1);

      if (result.success && !result.skipped) {
        downloadedCount++;
        downloadedBytes += result.size || 0;
        progress.completedFiles.push(result.filename);
        progress.failedFiles = progress.failedFiles.filter((f) => f.filename !== result.filename);
      } else if (result.skipped) {
        skippedCount++;
        if (!skippedSet.has(result.filename)) {
          progress.skippedFiles.push({
            filename: result.filename,
            reason: result.skipReason || "unknown",
            url: result.url,
          });
        }
      } else {
        failedCount++;
        const existingIdx = progress.failedFiles.findIndex((f) => f.filename === result.filename);
        if (existingIdx >= 0) {
          progress.failedFiles[existingIdx]!.error = result.error || "unknown";
        } else {
          progress.failedFiles.push({
            filename: result.filename,
            error: result.error || "unknown",
            url: result.url,
          });
        }
      }

      let status = "";
      if (result.success && !result.skipped) {
        status = `OK ${result.size ? formatBytes(result.size) : ""}`;
      } else if (result.skipped) {
        status = `SKIP: ${result.skipReason?.slice(0, 25) || ""}`;
      } else {
        status = `FAIL: ${result.error?.slice(0, 25) || ""}`;
      }

      process.stdout.write(
        `\r  ${completed}/${total} (${percent}%) | ${result.filename.slice(0, 20)} | ${status} | Total: ${formatBytes(downloadedBytes)}    `
      );

      if (Date.now() - lastSaveTime > 30000) {
        progress.lastUpdated = new Date().toISOString();
        void saveProgress(datasetFile, progress);
        lastSaveTime = Date.now();
      }
    };

    // Use sequential downloads for more reliable session handling
    // Switch to parallel only if concurrency > 1 and it seems to be working
    if (concurrency === 1) {
      await downloadFilesSequential(context, filesToDownload, outputDir, maxSizeMb, progressCallback);
    } else {
      await downloadFilesParallel(context, filesToDownload, outputDir, concurrency, maxSizeMb, progressCallback);
    }

    // Final save
    progress.lastUpdated = new Date().toISOString();
    await saveProgress(datasetFile, progress);

    const duration = Date.now() - startTime;
    const speed = downloadedBytes / (duration / 1000);

    console.log("\n\n======================================");
    console.log("DOWNLOAD COMPLETE");
    console.log("======================================");
    console.log(`Downloaded: ${downloadedCount} files (${formatBytes(downloadedBytes)})`);
    console.log(`Skipped: ${skippedCount} files`);
    console.log(`Failed: ${failedCount} files`);
    console.log(`Duration: ${formatDuration(duration)}`);
    console.log(`Speed: ${formatBytes(speed)}/s`);
    console.log(`\nTotal progress: ${progress.completedFiles.length}/${dataset.mp4Files.length} files`);
    console.log(`Progress saved to: ${getProgressFilePath(datasetFile)}`);

    if (progress.failedFiles.length > 0) {
      console.log(`\nFailed files (use --retry-failed to retry):`);
      for (const f of progress.failedFiles.slice(0, 5)) {
        console.log(`  ${f.filename}: ${f.error}`);
      }
      if (progress.failedFiles.length > 5) {
        console.log(`  ... and ${progress.failedFiles.length - 5} more`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(console.error);
