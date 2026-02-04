import { Glob } from "bun";
import { randomUUID } from "crypto";

const DOWNLOADS_DIR = "./downloads";
const THUMBNAILS_DIR = "./thumbnails";
const OUTPUT_FILE = "./video-metadata.json";

interface VideoMetadata {
  id: string;
  title: string;
  filename: string;
  length: string;
  hasThumbnail: boolean;
}

async function getVideoDuration(filePath: string): Promise<string> {
  try {
    // Use ffprobe to get duration in seconds
    const result = await Bun.$`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${filePath}`.text();
    const totalSeconds = parseFloat(result.trim());

    if (isNaN(totalSeconds)) {
      return "00:00";
    }

    // Convert to HH:MM:SS or MM:SS format
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
  } catch (error) {
    console.error(`  Error getting duration for ${filePath}: ${error}`);
    return "00:00";
  }
}

async function main() {
  console.log("Generate Video Metadata");
  console.log("=======================\n");

  // Get all video files (mp4 and mov)
  const files: string[] = [];

  for (const pattern of ["*.mp4", "*.mov"]) {
    const glob = new Glob(pattern);
    for await (const file of glob.scan(DOWNLOADS_DIR)) {
      files.push(file);
    }
  }

  files.sort();
  console.log(`Found ${files.length} video files`);

  // Get existing thumbnails
  const existingThumbnails = new Set<string>();
  const thumbGlob = new Glob("*.jpg");
  for await (const file of thumbGlob.scan(THUMBNAILS_DIR)) {
    existingThumbnails.add(file.replace(/\.jpg$/, ""));
  }
  console.log(`Found ${existingThumbnails.size} thumbnails\n`);

  if (files.length === 0) {
    console.log("No video files found!");
    return;
  }

  const metadata: VideoMetadata[] = [];
  const startTime = Date.now();

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const filenameWithoutExt = file.replace(/\.(mp4|mov)$/, "");
    const filePath = `${DOWNLOADS_DIR}/${file}`;

    process.stdout.write(`\r  [${i + 1}/${files.length}] Processing ${file}...`.padEnd(70));

    const length = await getVideoDuration(filePath);

    metadata.push({
      id: randomUUID(),
      title: file,
      filename: file,
      length: length,
      hasThumbnail: existingThumbnails.has(filenameWithoutExt),
    });
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Write to file
  await Bun.write(OUTPUT_FILE, JSON.stringify(metadata, null, 2));

  const withThumbnails = metadata.filter(m => m.hasThumbnail).length;

  console.log(`\n\n=======================`);
  console.log(`Generated metadata for ${metadata.length} videos`);
  console.log(`With thumbnails: ${withThumbnails}`);
  console.log(`Without thumbnails: ${metadata.length - withThumbnails}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Output: ${OUTPUT_FILE}`);

  // Show sample
  console.log("\nSample output:");
  console.log(JSON.stringify(metadata.slice(0, 2), null, 2));
}

main().catch(console.error);
