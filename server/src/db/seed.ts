import { db } from "./index";
import { videos } from "./schema";
import data from "../data.json";
import videoState from "../video-state.json";

interface VideoData {
  id: string;
  title: string | null;
  filename: string;
  length: string;
  hasThumbnail: boolean;
}

interface VideoStateEntry {
  filename: string;
  nsfw: boolean;
  is_shorts: boolean;
}

// Create a lookup map from filename to video state
const videoStateMap = new Map<string, VideoStateEntry>(
  (videoState as VideoStateEntry[]).map((entry) => [entry.filename, entry])
);

// Convert time string (e.g., "59:22", "1:00:25") to seconds
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 2) {
    // mm:ss format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // h:mm:ss format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  console.log("Clearing existing videos...");
  await db.delete(videos);

  // Insert all videos from data.json, filtering out those with null titles and NSFW videos
  const allVideos = data as VideoData[];
  const videoData = allVideos.filter((video) => {
    if (video.title === null) return false;
    const state = videoStateMap.get(video.filename);
    if (state?.nsfw) return false;
    return true;
  });

  const nullTitleCount = allVideos.filter((v) => v.title === null).length;
  const nsfwCount = allVideos.filter((v) => {
    const state = videoStateMap.get(v.filename);
    return state?.nsfw && v.title !== null;
  }).length;

  console.log(`Inserting ${videoData.length} videos (filtered out ${nullTitleCount} with null titles, ${nsfwCount} NSFW)...`);

  // Insert in batches of 100 to avoid issues with large inserts
  const batchSize = 100;
  for (let i = 0; i < videoData.length; i += batchSize) {
    const batch = videoData.slice(i, i + batchSize);
    await db.insert(videos).values(
      batch.map((video) => {
        const state = videoStateMap.get(video.filename);
        return {
          id: video.id,
          title: video.title,
          filename: video.filename,
          length: parseTimeToSeconds(video.length),
          hasThumbnail: video.hasThumbnail,
          is_shorts: state?.is_shorts ?? false,
        };
      })
    );
    console.log(`Inserted ${Math.min(i + batchSize, videoData.length)}/${videoData.length} videos`);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
