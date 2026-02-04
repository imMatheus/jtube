import { Glob } from "bun";

const DOWNLOADS_DIR = "./downloads";
const THUMBNAILS_DIR = "./thumbnails";
const THUMBNAIL_TIME = "00:00:10"; // Extract frame at 10 seconds
const THUMBNAIL_WIDTH = 480; // Width in pixels (height auto-scaled)

async function ensureDir(dir: string) {
  await Bun.$`mkdir -p ${dir}`.quiet();
}

async function hasVideoStream(videoPath: string): Promise<boolean> {
  try {
    const result = await Bun.$`ffprobe -v error -select_streams v -show_entries stream=codec_type -of csv=p=0 ${videoPath}`.text();
    return result.trim().includes("video");
  } catch {
    return false;
  }
}

async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

async function tryExtractFrame(videoPath: string, outputPath: string, seekTime?: string): Promise<boolean> {
  try {
    if (seekTime) {
      await Bun.$`ffmpeg -y -i ${videoPath} -ss ${seekTime} -vframes 1 -vf scale=${THUMBNAIL_WIDTH}:-1 -q:v 2 ${outputPath}`.quiet();
    } else {
      await Bun.$`ffmpeg -y -i ${videoPath} -vframes 1 -vf scale=${THUMBNAIL_WIDTH}:-1 -q:v 2 ${outputPath}`.quiet();
    }
    // ffmpeg returns 0 even when no frames are written (e.g., seeking past video end)
    // So we must verify the file was actually created
    return await fileExists(outputPath);
  } catch {
    return false;
  }
}

async function generateThumbnail(videoPath: string, outputPath: string): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  // Check if file has a video stream
  const hasVideo = await hasVideoStream(videoPath);
  if (!hasVideo) {
    return { ok: false, skipped: true, error: "No video stream (audio-only file)" };
  }

  // Try extracting at different timestamps, from later to earlier
  // This handles both long videos (nice frame at 10s) and short videos (fallback to first frame)
  const seekTimes = [THUMBNAIL_TIME, "00:00:01", "00:00:00.5", undefined];

  for (const seekTime of seekTimes) {
    if (await tryExtractFrame(videoPath, outputPath, seekTime)) {
      return { ok: true };
    }
  }

  return { ok: false, error: "Failed to extract any frame" };
}

async function main() {
  console.log("Generate Video Thumbnails");
  console.log("=========================\n");

  await ensureDir(THUMBNAILS_DIR);

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

  // Check which thumbnails already exist
  const existingThumbs = new Set<string>();
  const thumbGlob = new Glob("*.jpg");
  for await (const file of thumbGlob.scan(THUMBNAILS_DIR)) {
    existingThumbs.add(file.replace(/\.jpg$/, ""));
  }

  const toGenerate = files.filter(f => !existingThumbs.has(f.replace(/\.(mp4|mov)$/, "")));
  console.log(`Already have: ${existingThumbs.size} thumbnails`);
  console.log(`To generate: ${toGenerate.length}\n`);

  if (toGenerate.length === 0) {
    console.log("All thumbnails already exist!");
    return;
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;
  const startTime = Date.now();

  for (let i = 0; i < toGenerate.length; i++) {
    const file = toGenerate[i]!;
    const filename = file.replace(/\.(mp4|mov)$/, "");
    const videoPath = `${DOWNLOADS_DIR}/${file}`;
    const thumbPath = `${THUMBNAILS_DIR}/${filename}.jpg`;

    process.stdout.write(`\r  [${i + 1}/${toGenerate.length}] ${filename}...`.padEnd(60));

    const result = await generateThumbnail(videoPath, thumbPath);

    if (result.ok) {
      success++;
    } else if (result.skipped) {
      skipped++;
      console.log(`\n    Skipped: ${filename} (${result.error})`);
    } else {
      failed++;
      console.log(`\n    Failed: ${filename}`);
      if (result.error) {
        console.log(`      Error: ${result.error.slice(0, 200)}`);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n\n=========================`);
  console.log(`Generated: ${success} thumbnails`);
  console.log(`Skipped: ${skipped} (audio-only)`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Output: ${THUMBNAILS_DIR}/`);
}

main().catch(console.error);
