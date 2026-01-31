import { useParams } from "react-router";
import { CHANNEL_AVATAR_URL } from "../../constants";
import { Header } from "../layout/Header";
import { VideoPlayer } from "./VideoPlayer";
import { VideoInfo } from "./VideoInfo";
import { VideoSidebar } from "./VideoSidebar";
import { useData } from "../../hooks/useData";
import { getVideoUrl, getThumbnailUrl } from "../../utils/thumbnail";

export function VideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const { videos } = useData();

  const video = videos.find((v) => v.id === videoId);
  const suggestedVideos = videos.filter((v) => v.id !== videoId).slice(0, 500);

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
      <main className="pt-14 px-6 2xl:px-24">
        <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-6 py-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <VideoPlayer
              src={getVideoUrl(video.filename)}
              poster={getThumbnailUrl(video.filename)}
            />
            <VideoInfo
              title={video.title}
              views="174,908"
              uploadedAt="4 months ago"
              channelName="Jeffery Epstein"
              channelAvatar={CHANNEL_AVATAR_URL}
              subscribers="392K"
              description="Official Jeffery Epstein youtube channel."
              likes="3,918"
            />
          </div>

          {/* Sidebar */}
          <VideoSidebar videos={suggestedVideos} />
        </div>
      </main>
    </div>
  );
}
