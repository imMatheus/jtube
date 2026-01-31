import { useEffect, useRef } from "react";
import { useParams } from "react-router";
import { CHANNEL_AVATAR_URL } from "../../constants";
import { Header } from "../layout/Header";
import { VideoPlayer } from "./VideoPlayer";
import { VideoInfo } from "./VideoInfo";
import { VideoSidebar } from "./VideoSidebar";
import { CommentSection } from "../comments";
import { useData } from "../../hooks/useData";
import { getVideoUrl, getThumbnailUrl } from "../../utils/thumbnail";
import { formatViews } from "../../utils";

export function VideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const { videos, trackView } = useData();
  const trackedVideoId = useRef<string | null>(null);

  const video = videos.find((v) => v.id === videoId);
  const suggestedVideos = videos.filter((v) => v.id !== videoId).slice(0, 500);

  // Track view when video page is loaded (only once per video)
  useEffect(() => {
    if (videoId && trackedVideoId.current !== videoId) {
      trackedVideoId.current = videoId;
      trackView(videoId);
    }
  }, [videoId, trackView]);

  if (!video) {
    return (
      <div className="min-h-screen bg-(--color-bg-primary) text-(--color-text-primary)">
        <Header />
        <main className="pt-14 px-6">
          <p className="text-center py-20">Video not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color-bg-primary) text-(--color-text-primary)">
      <Header />
      <main className="pt-14 md:ml-60 px-4">
        <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-6 py-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <VideoPlayer
              src={getVideoUrl(video.filename)}
              poster={getThumbnailUrl(video.filename)}
            />
            <VideoInfo
              title={video.title}
              views={formatViews(video.views)}
              uploadedAt="4 months ago"
              channelName="Jeffery Epstein"
              channelAvatar={CHANNEL_AVATAR_URL}
              subscribers="392K"
              description="Official Jeffery Epstein youtube channel."
              likes="3,918"
            />
            <CommentSection videoId={video.id} />
          </div>

          {/* Sidebar */}
          <VideoSidebar videos={suggestedVideos} />
        </div>
      </main>
    </div>
  );
}
