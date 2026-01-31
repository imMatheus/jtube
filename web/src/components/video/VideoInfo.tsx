import { useState } from "react";
import { Link } from "react-router";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import {
  LikeIcon,
  DislikeIcon,
  ShareIcon,
  DownloadVideoIcon,
  MoreHorizIcon,
  VerifiedIcon,
} from "../icons";

interface VideoInfoProps {
  title: string;
  views: string;
  uploadedAt: string;
  channelName: string;
  channelAvatar: string;
  subscribers: string;
  description: string;
  likes: string;
}

export function VideoInfo({
  title,
  views,
  uploadedAt,
  channelName,
  channelAvatar,
  subscribers,
  description,
  likes,
}: VideoInfoProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="py-3">
      {/* Title */}
      <h1 className="text-xl font-semibold text-(--color-text-primary) mb-3">
        {title}
      </h1>

      {/* Channel info and actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Channel */}
        <div className="flex items-center gap-3">
          <Link to="/">
            <Avatar src={channelAvatar} size="md" />
          </Link>
          <div className="mr-4">
            <div className="flex items-center gap-1">
              <span className="text-base font-medium text-(--color-text-primary)">
                {channelName}
              </span>
              <VerifiedIcon />
            </div>
            <span className="text-sm text-(--color-text-secondary)">
              {subscribers} subscribers
            </span>
          </div>
          <Button variant="primary" className="rounded-full px-4 py-2 text-sm font-medium">
            Subscribe
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Like/Dislike */}
          <div className="flex items-center bg-(--color-bg-secondary) rounded-full overflow-hidden">
            <button className="flex items-center gap-2 px-4 py-2 hover:bg-(--color-bg-hover) transition-colors">
              <LikeIcon />
              <span className="text-sm font-medium">{likes}</span>
            </button>
            <div className="w-px h-6 bg-(--color-border-light)" />
            <button className="px-4 py-2 hover:bg-(--color-bg-hover) transition-colors">
              <DislikeIcon />
            </button>
          </div>

          {/* Share */}
          <button className="flex items-center gap-2 px-4 py-2 bg-(--color-bg-secondary) rounded-full hover:bg-(--color-bg-hover) transition-colors">
            <ShareIcon />
            <span className="text-sm font-medium">Share</span>
          </button>

          {/* Download */}
          <button className="flex items-center gap-2 px-4 py-2 bg-(--color-bg-secondary) rounded-full hover:bg-(--color-bg-hover) transition-colors">
            <DownloadVideoIcon />
            <span className="text-sm font-medium">Download</span>
          </button>

          {/* More */}
          <button className="p-2 bg-(--color-bg-secondary) rounded-full hover:bg-(--color-bg-hover) transition-colors">
            <MoreHorizIcon />
          </button>
        </div>
      </div>

      {/* Description */}
      <div
        className="mt-4 p-3 bg-(--color-bg-secondary) rounded-xl cursor-pointer hover:bg-(--color-bg-hover) transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-(--color-text-primary) mb-1">
          <span>{views} views</span>
          <span>•</span>
          <span>{uploadedAt}</span>
        </div>
        <p
          className={`text-sm text-(--color-text-primary) ${expanded ? "" : "line-clamp-2"
            }`}
        >
          {description}
        </p>
        {!expanded && (
          <span className="text-sm font-medium text-(--color-text-primary) mt-1">
            ...more
          </span>
        )}
      </div>
    </div>
  );
}
