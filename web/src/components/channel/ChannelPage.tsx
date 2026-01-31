import { useState } from "react";
import { CHANNEL_AVATAR_URL, CHANNEL_BANNER_URL } from "../../constants";
import { ChannelBanner } from "./ChannelBanner";
import { ChannelInfo } from "./ChannelInfo";
import { ChannelTabs } from "./ChannelTabs";
import { VideoCard } from "../ui/VideoCard";
import { VideoCarousel } from "../ui/VideoCarousel";
import { useData } from "../../hooks/useData";
import { getThumbnailUrl } from "../../utils/thumbnail";


export function ChannelPage() {
  const [activeTab, setActiveTab] = useState("home");
  const { videos } = useData();

  const recentVideos = videos.slice(0, 12);
  const olderVideos = videos.slice(12, 24);

  return (
    <main className="md:ml-60 pt-14 min-h-screen bg-(--color-bg-primary)">
      <div className="max-w-[1284px] mx-auto px-4 md:px-6 py-4">
        <ChannelBanner src={CHANNEL_BANNER_URL} />

        <ChannelInfo
          name="Jeffery Epstein"
          handle="@jefferyepstein"
          subscribers="392K"
          videoCount={videos.length}
          description="Official Jeffery Epstein youtube channel."
          avatar={CHANNEL_AVATAR_URL}
          verified
        />

        <ChannelTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === "home" && (
          <div className="py-6 space-y-8">
            {/* Recent Videos */}
            <VideoCarousel title="Videos">
              {recentVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  videoId={video.id}
                  thumbnail={getThumbnailUrl(video.filename)}
                  title={video.title}
                  duration={video.length}
                  views="1.2K"
                  uploadedAt="2 days ago"
                  size="md"
                />
              ))}
            </VideoCarousel>

            <div className="border-t border-(--color-border-light)" />

            {/* More Videos */}
            <VideoCarousel title="More videos" showPlayAll>
              {olderVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  videoId={video.id}
                  thumbnail={getThumbnailUrl(video.filename)}
                  title={video.title}
                  duration={video.length}
                  views="856"
                  uploadedAt="1 week ago"
                  size="md"
                />
              ))}
            </VideoCarousel>
          </div>
        )}

        {activeTab === "videos" && (
          <div className="py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  videoId={video.id}
                  thumbnail={getThumbnailUrl(video.filename)}
                  title={video.title}
                  duration={video.length}
                  views="1.2K"
                  uploadedAt="2 days ago"
                  size="lg"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
