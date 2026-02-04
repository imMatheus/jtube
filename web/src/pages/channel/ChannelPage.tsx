import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Helmet } from "react-helmet-async";
import { CHANNEL_AVATAR_URL, CHANNEL_BANNER_URL } from "../../constants";
import { ChannelBanner } from "./ChannelBanner";
import { ChannelInfo } from "./ChannelInfo";
import { ChannelTabs } from "./ChannelTabs";
import { VideoCard } from "../../components/ui/VideoCard";
import { useData, type Video } from "../../hooks/useData";
import { PlayIcon } from "../../components/icons";
import { getThumbnailUrl } from "../../utils/thumbnail";
import { formatDuration } from "../../utils";

interface Playlist {
  id: string;
  name: string;
  videos: Video[];
}

function formatPlaylistName(id: string): string {
  return id
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface PlaylistCardProps {
  playlist: Playlist;
}

function PlaylistCard({ playlist }: PlaylistCardProps) {
  const firstVideo = playlist.videos[0];
  const totalDuration = playlist.videos.reduce((acc, v) => acc + v.length, 0);

  return (
    <Link
      to={`/playlist/${playlist.id}/${firstVideo.id}`}
      className="group block"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-(--color-bg-tertiary)">
        <img
          src={getThumbnailUrl(firstVideo)}
          alt={playlist.name}
          className="w-full h-full object-cover"
        />
        {/* Playlist overlay on right side */}
        <div className="absolute inset-y-0 right-0 w-[40%] bg-black/80 flex flex-col items-center justify-center gap-1 opacity-100 group-hover:opacity-0 transition-opacity">
          <span className="text-white text-lg font-medium">{playlist.videos.length}</span>
          <PlayIcon />
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 text-white">
            <PlayIcon />
            <span className="font-medium">Play all</span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-medium text-(--color-text-primary) line-clamp-2">
          {playlist.name}
        </h3>
        <p className="text-xs text-(--color-text-secondary) mt-1">
          {playlist.videos.length} videos • {formatDuration(totalDuration)} total
        </p>
      </div>
    </Link>
  );
}

export function ChannelPage() {
  const [activeTab, setActiveTab] = useState("videos");
  const { videos } = useData();

  // Group videos by playlist
  const playlists = useMemo(() => {
    const playlistMap = new Map<string, Video[]>();

    videos.forEach((video) => {
      if (video.playlist) {
        const existing = playlistMap.get(video.playlist) || [];
        existing.push(video);
        playlistMap.set(video.playlist, existing);
      }
    });

    return Array.from(playlistMap.entries()).map(([id, vids]) => ({
      id,
      name: formatPlaylistName(id),
      videos: vids,
    }));
  }, [videos]);

  // Sort videos: no playlist first, then by playlist name
  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => {
      // Videos without playlist come first
      if (!a.playlist && b.playlist) return -1;
      if (a.playlist && !b.playlist) return 1;
      // If both have playlists, sort by playlist name
      if (a.playlist && b.playlist) {
        return a.playlist.localeCompare(b.playlist);
      }
      return 0;
    });
  }, [videos]);

  return (
    <>
      <Helmet>
        <title>Jeffery Epstein - JeffTube</title>
        <meta name="description" content="Official Jeffery Epstein JeffTube channel. Watch the latest videos and subscribe for more content." />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="JeffTube" />
        <meta property="og:title" content="Jeffery Epstein - JeffTube" />
        <meta property="og:description" content="Official Jeffery Epstein JeffTube channel. Watch the latest videos and subscribe for more content." />
        <meta property="og:image" content="/preview.png" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Jeffery Epstein - JeffTube" />
        <meta name="twitter:description" content="Official Jeffery Epstein JeffTube channel. Watch the latest videos and subscribe for more content." />
        <meta name="twitter:image" content="/preview.png" />
      </Helmet>
      <main className="md:ml-60 pt-14 min-h-screen bg-(--color-bg-primary)">
        <div className="max-w-[1284px] mx-auto px-4 md:px-6 py-4">
          <ChannelBanner src={CHANNEL_BANNER_URL} />

          <ChannelInfo
            name="Jeffery Epstein"
            handle="@jeevacation"
            videoCount={videos.length}
            description="All of the videos released by the DOJ from the Epstein files."
            avatar={CHANNEL_AVATAR_URL}
            verified
          />

          <ChannelTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {activeTab === "videos" && (
            <div className="py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sortedVideos.map((video) => (
                  <VideoCard key={video.id} video={video} size="lg" />
                ))}
              </div>
            </div>
          )}

          {activeTab === "playlists" && (
            <div className="py-6">
              {playlists.length === 0 ? (
                <p className="text-center text-(--color-text-secondary) py-10">
                  No playlists available
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {playlists.map((playlist) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
