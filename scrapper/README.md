# Scrapper

A collection of tools for scraping, downloading, and processing video files from DOJ Epstein disclosure datasets.

## Prerequisites

- [Bun](https://bun.sh) runtime
- [Playwright](https://playwright.dev) (installed via `bun install`)
- [ffmpeg](https://ffmpeg.org) (for thumbnail and metadata generation)
- [gcloud CLI](https://cloud.google.com/sdk/gcloud) (for GCP uploads)

## Installation

```bash
bun install

# Install Chromium browser for Playwright
bunx playwright install chromium
```

## Scripts

### 1. Scraper (`scraper.ts`)

Scrapes MP4/MOV file links from DOJ disclosure pages using Playwright.

**Usage:**

```bash
# Scrape all datasets (9, 10, 11)
bun run scraper.ts

# Scrape a specific dataset
bun run scraper.ts --dataset 9
bun run scraper.ts --dataset 10
bun run scraper.ts --dataset 11

# Run with visible browser (for debugging)
bun run scraper.ts --visible

# Limit pages to scrape (useful for testing)
bun run scraper.ts --max-pages 50

# Increase parallel workers for faster scraping
bun run scraper.ts --concurrency 20

# Retry only failed pages
bun run scraper.ts --retry-failed

# Start fresh, clearing all progress
bun run scraper.ts --clear-progress

# Use sequential mode (click through pages instead of parallel)
bun run scraper.ts --sequential

# Enable debug timing
bun run scraper.ts --debug
```

**NPM Scripts:**

```bash
bun run scrape           # Scrape all datasets
bun run scrape:9         # Scrape dataset 9 only
bun run scrape:10        # Scrape dataset 10 only
bun run scrape:11        # Scrape dataset 11 only
bun run scrape:visible   # Run with visible browser
bun run scrape:test      # Test with 50 pages max
bun run scrape:fast      # Run with 20 parallel workers
bun run scrape:retry     # Retry failed pages
bun run scrape:fresh     # Start fresh
```

**Options:**

| Flag                | Description                              | Default |
|---------------------|------------------------------------------|---------|
| `--dataset <id>`    | Scrape only this dataset (9, 10, or 11)  | all     |
| `--max-pages <n>`   | Limit to first n pages per dataset       | all     |
| `--concurrency <n>` | Number of parallel page fetches          | 5       |
| `--visible`         | Run browser in visible mode              | false   |
| `--retry-failed`    | Only retry previously failed pages       | false   |
| `--clear-progress`  | Start fresh, ignore previous progress    | false   |
| `--sequential`      | Click through pages instead of parallel  | false   |
| `--debug`           | Enable timing debug output               | false   |

**Output Files:**
- `data-set-9.json` - Scraped file list for dataset 9
- `data-set-10.json` - Scraped file list for dataset 10
- `data-set-11.json` - Scraped file list for dataset 11
- `progress-{9,10,11}.json` - Progress tracking for resume capability

---

### 2. Bruteforce Scanner (`bruteforce.ts`)

Scans for video files by brute-forcing EFTA filename patterns (EFTA00000001.mp4, etc.).

**Usage:**

```bash
# Linear scan from start to end
bun run bruteforce.ts --dataset 9 --start 64000 --end 100000

# Outward scan from a center point (expands in both directions)
bun run bruteforce.ts --dataset 9 --center 1622053
bun run bruteforce.ts --dataset 9 --center EFTA01622053

# With bounds for outward scan
bun run bruteforce.ts --dataset 10 --center 1650000 --start 1600000 --end 1700000

# Increase concurrency
bun run bruteforce.ts --dataset 9 --center 1622053 --concurrency 20

# Resume previous scan
bun run bruteforce.ts --dataset 9 --resume

# Show browser window
bun run bruteforce.ts --dataset 9 --start 0 --end 1000 --visible
```

**Options:**

| Flag                  | Description                                | Default   |
|-----------------------|--------------------------------------------|-----------|
| `--dataset <9\|10>`   | Dataset to scan                            | 9         |
| `--start <number>`    | Start number for linear scan               | 0         |
| `--end <number>`      | End number for linear scan                 | 2000000   |
| `--center <num\|EFTA>`| Center number to expand from               | -         |
| `--concurrency <n>`   | Parallel requests                          | 10        |
| `--visible`           | Show browser window                        | false     |
| `--resume`            | Resume from previous progress              | false     |

**Output Files:**
- `bruteforce-{dataset}-found.json` - Found files
- `bruteforce-{dataset}-progress.json` - Progress tracking

---

### 3. Downloader (`downloader.ts`)

Downloads video files from scraped URLs.

**Usage:**

```bash
# Download files from a dataset
bun run downloader.ts data-set-10.json

# Specify output directory
bun run downloader.ts data-set-10.json --output ./videos

# Limit number of downloads
bun run downloader.ts data-set-10.json --max 100

# Increase parallel downloads
bun run downloader.ts data-set-10.json --concurrency 3

# Skip files larger than specified size (in MB)
bun run downloader.ts data-set-10.json --max-size 100

# Start from a specific index
bun run downloader.ts data-set-10.json --start-from 500

# Retry failed downloads
bun run downloader.ts data-set-10.json --retry-failed

# Start fresh
bun run downloader.ts data-set-10.json --clear-progress

# Dry run (show what would be downloaded)
bun run downloader.ts data-set-10.json --dry-run

# Show browser window
bun run downloader.ts data-set-10.json --visible
```

**Options:**

| Flag                | Description                              | Default      |
|---------------------|------------------------------------------|--------------|
| `--output <dir>`    | Output directory                         | ./downloads  |
| `--max <number>`    | Maximum files to download                | all          |
| `--concurrency <n>` | Parallel downloads                       | 2            |
| `--max-size <mb>`   | Skip files larger than this (MB)         | 5000         |
| `--start-from <n>`  | Start from specific index                | 0            |
| `--retry-failed`    | Only retry failed downloads              | false        |
| `--clear-progress`  | Start fresh                              | false        |
| `--visible`         | Show browser window                      | false        |
| `--dry-run`         | Preview without downloading              | false        |

**Output Files:**
- `./downloads/` - Downloaded video files
- `data-set-{id}-download-progress.json` - Download progress tracking

---

### 4. Upload to GCP (`upload-to-gcp.ts`)

Uploads downloaded videos to Google Cloud Storage.

**Usage:**

```bash
# Upload to a specific bucket
bun run upload-to-gcp.ts --bucket=my-video-bucket

# Dry run (show what would be uploaded)
bun run upload-to-gcp.ts --bucket=my-video-bucket --dry-run

# Using environment variable
GCP_BUCKET=my-bucket bun run upload-to-gcp.ts
```

**Options:**

| Flag              | Description                                      |
|-------------------|--------------------------------------------------|
| `--bucket=<name>` | GCP bucket name (required unless GCP_BUCKET set) |
| `--dry-run`       | Show what would be uploaded                      |

**Notes:**
- Requires `gcloud` CLI to be authenticated
- Skips files that already exist in the bucket
- Uploads to `videos/` folder in the bucket

---

### 5. Generate Thumbnails (`generate-thumbnails.ts`)

Generates thumbnail images from downloaded videos using ffmpeg.

**Usage:**

```bash
bun run generate-thumbnails.ts
```

**Configuration (in source):**
- `DOWNLOADS_DIR` - Source directory (default: ./downloads)
- `THUMBNAILS_DIR` - Output directory (default: ./thumbnails)
- `THUMBNAIL_TIME` - Frame extraction time (default: 00:00:10)
- `THUMBNAIL_WIDTH` - Thumbnail width in pixels (default: 480)

**Output:**
- `./thumbnails/*.jpg` - Generated thumbnail images

**Notes:**
- Skips audio-only files
- Automatically falls back to earlier timestamps for short videos
- Skips files that already have thumbnails

---

### 6. Generate Video Metadata (`generate-video-metadata.ts`)

Generates metadata JSON for all downloaded videos including duration.

**Usage:**

```bash
bun run generate-video-metadata.ts
```

**Output:**
- `video-metadata.json` - Metadata for all videos

**Metadata Format:**

```json
{
  "id": "uuid",
  "title": "EFTA00064598.mp4",
  "filename": "EFTA00064598.mp4",
  "length": "1:23:45",
  "hasThumbnail": true
}
```

---

### 7. Get Unique Filenames (`get-unique-filenames.ts`)

Extracts unique filenames from all scraped dataset files.

**Usage:**

```bash
bun run get-unique-filenames.ts
```

**Output:**
- `unique-filenames.json` - Array of all unique filenames across datasets

---

### 8. Video Viewer (`video-viewer.html`)

A simple HTML page to view all videos in a grid layout. Videos auto-play when scrolled into view.

**Usage:**

1. Start the server (from the server directory):
   ```bash
   cd ../server && bun run dev
   ```

2. Open `video-viewer.html` in a browser

**Features:**
- Fetches video list from `http://localhost:3001/api/videos`
- Videos auto-play (muted) when scrolled into view
- Videos pause when scrolled out of view
- Dark theme UI

---

## Typical Workflow

1. **Scrape** - Get list of video URLs:
   ```bash
   bun run scraper.ts --dataset 10
   ```

2. **Download** - Download the videos:
   ```bash
   bun run downloader.ts data-set-10.json --output ./downloads
   ```

3. **Generate Thumbnails**:
   ```bash
   bun run generate-thumbnails.ts
   ```

4. **Generate Metadata**:
   ```bash
   bun run generate-video-metadata.ts
   ```

5. **Upload to GCP**:
   ```bash
   bun run upload-to-gcp.ts --bucket=jefftube
   ```

6. **View** - Open `video-viewer.html` in browser

---

## Data Files

| File | Description |
|------|-------------|
| `data-set-{9,10,11}.json` | Scraped video URLs and filenames |
| `progress-{9,10,11}.json` | Scraping progress for resume |
| `data-set-*-download-progress.json` | Download progress tracking |
| `bruteforce-*-found.json` | Files found via bruteforce |
| `bruteforce-*-progress.json` | Bruteforce scan progress |
| `unique-filenames.json` | All unique filenames |
| `video-metadata.json` | Video metadata with durations |

---

## Progress Tracking

All scripts support fail-safe progress tracking:

- Progress is saved periodically (every 10-30 seconds)
- Scripts can be stopped and resumed at any time
- Use `--retry-failed` to retry only failed items
- Use `--clear-progress` to start fresh

To check progress manually:

```bash
# Check scraping progress
cat progress-9.json | jq '.completedPages | length'

# Check download progress
cat data-set-10-download-progress.json | jq '.completedFiles | length'
```
