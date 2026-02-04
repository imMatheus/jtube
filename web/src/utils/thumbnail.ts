import type { Video } from "../hooks/useData";

const ASSETS_BASE_URL = "https://storage.cloud.google.com/jefftube";

export function getThumbnailUrl(video: Video): string {
  if (video.hasThumbnail) {
    return `${ASSETS_BASE_URL}/thumbnails/${video.filename.replace(/\.(mp4|mov)$/, "")}.jpg`;
  }
  return `/audio-placeholder.png`;
}

export function getVideoUrl(filename: string): string {
  return `${ASSETS_BASE_URL}/${filename}`;
}
