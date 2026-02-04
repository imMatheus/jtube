import { Glob } from "bun";

// Configuration - update this with your bucket name
const BUCKET_NAME = process.env.GCP_BUCKET || "your-bucket-name";
const DOWNLOADS_DIR = "./downloads";
const BUCKET_PATH = "videos"; // folder in bucket (optional)

interface UploadResult {
  filename: string;
  status: "uploaded" | "skipped" | "failed";
  error?: string;
}

async function getBucketFiles(): Promise<Set<string>> {
  console.log(`Fetching existing files from gs://${BUCKET_NAME}/${BUCKET_PATH}/...`);

  try {
    const result = await Bun.$`gcloud storage ls gs://${BUCKET_NAME}/${BUCKET_PATH}/`.text();
    const files = new Set<string>();

    for (const line of result.split("\n")) {
      if (line.trim()) {
        // Extract filename from full path like gs://bucket/videos/file.mp4
        const filename = line.trim().split("/").pop();
        if (filename) {
          files.add(filename);
        }
      }
    }

    return files;
  } catch (error) {
    // Bucket path might not exist yet
    console.log("  No existing files found (or path doesn't exist yet)");
    return new Set();
  }
}

async function getLocalFiles(): Promise<string[]> {
  const glob = new Glob("*.mp4");
  const files: string[] = [];

  for await (const file of glob.scan(DOWNLOADS_DIR)) {
    files.push(file);
  }

  return files.sort();
}

async function uploadFile(filename: string): Promise<UploadResult> {
  const localPath = `${DOWNLOADS_DIR}/${filename}`;
  const remotePath = `gs://${BUCKET_NAME}/${BUCKET_PATH}/${filename}`;

  try {
    await Bun.$`gcloud storage cp ${localPath} ${remotePath}`.quiet();
    return { filename, status: "uploaded" };
  } catch (error) {
    return {
      filename,
      status: "failed",
      error: String(error).slice(0, 100)
    };
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const bucketArg = args.find(a => a.startsWith("--bucket="));

  if (bucketArg) {
    const bucketName = bucketArg.split("=")[1];
    if (bucketName) {
      (globalThis as any).BUCKET_NAME = bucketName;
    }
  }

  const actualBucket = bucketArg?.split("=")[1] || BUCKET_NAME;

  if (actualBucket === "your-bucket-name") {
    console.log(`
Upload Videos to GCP Bucket
===========================

Usage: bun upload-to-gcp.ts --bucket=<bucket-name> [options]

Options:
  --bucket=<name>   GCP bucket name (required, or set GCP_BUCKET env var)
  --dry-run         Show what would be uploaded without uploading

Examples:
  bun upload-to-gcp.ts --bucket=my-video-bucket
  bun upload-to-gcp.ts --bucket=my-video-bucket --dry-run
  GCP_BUCKET=my-bucket bun upload-to-gcp.ts
`);
    process.exit(1);
  }

  console.log("Upload Videos to GCP Bucket");
  console.log("===========================");
  console.log(`Bucket: gs://${actualBucket}/${BUCKET_PATH}/`);
  console.log(`Source: ${DOWNLOADS_DIR}`);
  if (dryRun) console.log("Mode: Dry run");
  console.log("");

  // Get existing files in bucket
  const existingFiles = await getBucketFiles();
  console.log(`  Found ${existingFiles.size} existing files in bucket\n`);

  // Get local files
  const localFiles = await getLocalFiles();
  console.log(`Local files: ${localFiles.length}`);

  // Determine which files to upload
  const filesToUpload = localFiles.filter(f => !existingFiles.has(f));
  const filesToSkip = localFiles.filter(f => existingFiles.has(f));

  console.log(`To upload: ${filesToUpload.length}`);
  console.log(`To skip: ${filesToSkip.length}\n`);

  if (filesToUpload.length === 0) {
    console.log("All files already exist in bucket. Nothing to upload!");
    return;
  }

  if (dryRun) {
    console.log("Files that would be uploaded:");
    for (const file of filesToUpload.slice(0, 20)) {
      const stat = await Bun.file(`${DOWNLOADS_DIR}/${file}`).stat();
      console.log(`  ${file} (${formatBytes(stat?.size || 0)})`);
    }
    if (filesToUpload.length > 20) {
      console.log(`  ... and ${filesToUpload.length - 20} more`);
    }
    return;
  }

  // Upload files
  const results: UploadResult[] = [];
  let uploaded = 0;
  let failed = 0;
  let totalBytes = 0;
  const startTime = Date.now();

  for (let i = 0; i < filesToUpload.length; i++) {
    const file = filesToUpload[i]!;
    const stat = await Bun.file(`${DOWNLOADS_DIR}/${file}`).stat();
    const fileSize = stat?.size || 0;

    process.stdout.write(`\r  [${i + 1}/${filesToUpload.length}] Uploading ${file}...`.padEnd(80));

    const result = await uploadFile(file);
    results.push(result);

    if (result.status === "uploaded") {
      uploaded++;
      totalBytes += fileSize;
    } else {
      failed++;
      console.log(`\n    Failed: ${result.error}`);
    }
  }

  const duration = (Date.now() - startTime) / 1000;

  console.log("\n\n===========================");
  console.log("UPLOAD COMPLETE");
  console.log("===========================");
  console.log(`Uploaded: ${uploaded} files (${formatBytes(totalBytes)})`);
  console.log(`Skipped: ${filesToSkip.length} files (already exist)`);
  console.log(`Failed: ${failed} files`);
  console.log(`Duration: ${duration.toFixed(1)}s`);

  if (uploaded > 0) {
    console.log(`Speed: ${formatBytes(totalBytes / duration)}/s`);
  }

  if (failed > 0) {
    console.log("\nFailed files:");
    for (const r of results.filter(r => r.status === "failed").slice(0, 10)) {
      console.log(`  ${r.filename}: ${r.error}`);
    }
  }

  console.log(`\nFiles accessible at: https://storage.googleapis.com/${actualBucket}/${BUCKET_PATH}/<filename>`);
}

main().catch(console.error);
