import { useEffect, useRef } from "react";
import { useParams, Link } from "react-router";
import { Helmet } from "react-helmet-async";
import { Header } from "../../components/layout/Header";
import { VideoPlayer } from "../../components/video/VideoPlayer";
import { VideoInfo } from "../../components/video/VideoInfo";
import { CommentSection } from "../../components/comments";
import { useData, type Video } from "../../hooks/useData";
import { getVideoUrl, getThumbnailUrl } from "../../utils/thumbnail";
import { formatDuration, cn } from "../../utils";
import { MoreVertIcon, PlayIcon } from "../../components/icons";
import { NotFoundPageContent } from "../../components/NotFoundPage";

function formatPlaylistName(id: string): string {
  return id
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface PlaylistSidebarCardProps {
  video: Video;
  playlistId: string;
  index: number;
  isActive: boolean;
}

function PlaylistSidebarCard({ video, playlistId, index, isActive }: PlaylistSidebarCardProps) {
  return (
    <Link
      to={`/playlist/${playlistId}/${video.id}`}
      className={cn(
        "flex gap-2 group p-2 rounded-lg transition-colors",
        isActive ? "bg-(--color-bg-tertiary)" : "hover:bg-(--color-bg-hover)"
      )}
    >
      <div className="flex items-center shrink-0 w-6 text-xs text-(--color-text-secondary)">
        {isActive ? (
          <PlayIcon />
        ) : (
          <span>{index + 1}</span>
        )}
      </div>
      <div className="relative w-24 shrink-0 aspect-video bg-(--color-bg-tertiary) rounded-lg overflow-hidden">
        <img
          src={getThumbnailUrl(video)}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-1 right-1 bg-(--color-overlay) text-white text-xs px-1 py-0.5 rounded font-medium">
          {formatDuration(video.length)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <h3 className={cn(
            "text-sm font-medium line-clamp-2 leading-5",
            isActive ? "text-(--color-text-primary)" : "text-(--color-text-primary)"
          )}>
            {video.title}
          </h3>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 -mr-1 hover:bg-(--color-bg-hover) rounded-full">
            <MoreVertIcon />
          </button>
        </div>
        <p className="text-xs text-(--color-text-secondary) mt-1">Jeffery Epstein</p>
      </div>
    </Link>
  );
}

interface PlaylistSidebarProps {
  playlistId: string;
  playlistName: string;
  videos: Video[];
  currentVideoId: string;
}

function PlaylistSidebar({ playlistId, playlistName, videos, currentVideoId }: PlaylistSidebarProps) {
  const currentIndex = videos.findIndex(v => v.id === currentVideoId);
  const totalDuration = videos.reduce((acc, v) => acc + v.length, 0);

  return (
    <aside className="w-full h-max lg:w-[400px] shrink-0 border border-(--color-border-light) rounded-xl overflow-hidden">
      {/* Playlist header */}
      <div className="bg-(--color-bg-secondary) p-4">
        <h2 className="text-lg font-bold text-(--color-text-primary)">{playlistName}</h2>
        <p className="text-sm text-(--color-text-secondary) mt-1">
          Jeffery Epstein • {currentIndex + 1}/{videos.length}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Link
            to={`/playlist/${playlistId}/${videos[0].id}`}
            className="flex items-center gap-2 px-4 py-2 bg-(--color-text-primary) text-(--color-bg-primary) rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <PlayIcon />
            Play all
          </Link>
        </div>
        <p className="text-xs text-(--color-text-secondary) mt-3">
          {videos.length} videos • {formatDuration(totalDuration)} total
        </p>
      </div>

      {/* Video list */}
      <div className="flex flex-col gap-1 max-h-[600px] overflow-y-auto p-2">
        {videos.map((video, index) => (
          <PlaylistSidebarCard
            key={video.id}
            video={video}
            playlistId={playlistId}
            index={index}
            isActive={video.id === currentVideoId}
          />
        ))}
      </div>
    </aside>
  );
}

export function PlaylistVideoPage() {
  const { playlistId, videoId } = useParams<{ playlistId: string; videoId: string }>();
  const { videos, trackView } = useData();
  const trackedVideoId = useRef<string | null>(null);

  // Get all videos in this playlist
  const playlistVideos = videos.filter((v) => v.playlist === playlistId);
  const video = videos.find((v) => v.id === videoId);
  const playlistName = playlistId ? formatPlaylistName(playlistId) : "";

  // Track view when video page is loaded (only once per video)
  useEffect(() => {
    if (videoId && trackedVideoId.current !== videoId) {
      trackedVideoId.current = videoId;
      trackView(videoId);
    }
  }, [videoId, trackView]);

  if (!video || playlistVideos.length === 0) {
    return (
      <div className="min-h-screen bg-(--color-bg-primary) text-(--color-text-primary)">
        <Header />
        <NotFoundPageContent />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color-bg-primary) text-(--color-text-primary)">
      <Helmet>
        <title>{video.title} - {playlistName} - JeffTube</title>
        <meta name="description" content={`Watch ${video.title} from ${playlistName} on JeffTube`} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="video.other" />
        <meta property="og:site_name" content="JeffTube" />
        <meta property="og:title" content={video.title} />
        <meta property="og:description" content={`Watch ${video.title} from ${playlistName} on JeffTube`} />
        <meta property="og:image" content={getThumbnailUrl(video)} />
        <meta property="og:image:width" content="1280" />
        <meta property="og:image:height" content="720" />
        <meta property="og:image:alt" content={video.title} />
        <meta property="og:video" content={getVideoUrl(video.filename)} />
        <meta property="og:video:type" content="video/mp4" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={video.title} />
        <meta name="twitter:description" content={`Watch ${video.title} from ${playlistName} on JeffTube`} />
        <meta name="twitter:image" content={getThumbnailUrl(video)} />
        <meta name="twitter:image:alt" content={video.title} />
      </Helmet>
      <Header />
      <main className="pt-14 px-4">
        <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-6 py-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <VideoPlayer
              src={getVideoUrl(video.filename)}
              poster={getThumbnailUrl(video)}
            />
            <VideoInfo video={video} />
            <CommentSection videoId={video.id} />
          </div>

          {/* Playlist Sidebar */}
          <PlaylistSidebar
            playlistId={playlistId!}
            playlistName={playlistName}
            videos={playlistVideos}
            currentVideoId={videoId!}
          />
        </div>
      </main>
    </div>
  );
}
