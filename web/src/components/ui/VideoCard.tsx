import { Link } from "react-router";
import type { Video } from "../../hooks/useData";
import { cn, formatDuration, formatViews } from "../../utils";
import { getThumbnailUrl } from "../../utils/thumbnail";
import { MoreVertIcon, VerifiedIcon } from "../icons";

interface VideoCardProps {
  video: Video;
  showChannel?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-[168px]",
  md: "w-[210px]",
  lg: "w-full max-w-[360px]",
};

export function VideoCard({
  video,
  showChannel = false,
  size = "md",
}: VideoCardProps) {
  const thumbnail = getThumbnailUrl(video.filename);

  return (
    <Link
      to={`/watch/${video.id}`}
      className={cn("group shrink-0 block", sizeClasses[size])}
    >
      <div className="relative aspect-video bg-(--color-bg-tertiary) rounded-xl overflow-hidden mb-2">
        <img
          src={thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-1 right-1 bg-(--color-overlay) text-white text-xs px-1 py-0.5 rounded font-medium">
          {formatDuration(video.length)}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-sm font-medium text-(--color-text-primary) line-clamp-2 leading-5">
              {video.title}
            </h3>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 -mr-1 hover:bg-(--color-bg-hover) rounded-full"
            >
              <MoreVertIcon />
            </button>
          </div>
          {showChannel && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-(--color-text-secondary) hover:text-(--color-text-primary) cursor-pointer">
                Jeffery Epstein
              </span>
              <VerifiedIcon />
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-(--color-text-secondary) mt-0.5">
            <span>{formatViews(video.views)} views</span>
            <span>•</span>
            <span>{formatViews(video.likes)} {video.likes === 1 ? "like" : "likes"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
