import { Link } from "react-router";
import NumberFlow from "@number-flow/react";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import {
  LikeIcon,
  ShareIcon,
  MoreHorizIcon,
  VerifiedIcon,
} from "../icons";
import { useVideoLike, useLikeVideo } from "../../hooks/useVideoLikes";
import { formatViews } from "../../utils";
import { type Video } from "../../hooks/useData";
import { CHANNEL_AVATAR_URL } from "../../constants";

interface VideoInfoProps {
  video: Video;
}

export function VideoInfo({ video }: VideoInfoProps) {
  const { data: likeData } = useVideoLike(video.id);
  const likeMutation = useLikeVideo(video.id);

  const userLike = likeData?.userLike ?? null;
  const isLiked = userLike === true;

  const channelName = "Jeffery Epstein";
  const description = "Official Jeffery Epstein youtube channel.";

  return (
    <div className="py-3">
      <h1 className="text-xl font-semibold text-(--color-text-primary) mb-3">
        {video.title}
      </h1>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div className="flex items-center gap-3">
          <Link to="/">
            <Avatar src={CHANNEL_AVATAR_URL} size="md" />
          </Link>
          <div className="mr-4">
            <div className="flex items-center gap-1">
              <span className="text-base font-medium text-(--color-text-primary)">
                {channelName}
              </span>
              <VerifiedIcon />
            </div>
          </div>
          <Button variant="primary" className="rounded-full px-4 py-2 text-sm font-medium">
            Subscribe
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-(--color-bg-secondary) rounded-full hover:bg-(--color-bg-hover) transition-colors cursor-pointer"
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
          >
            <LikeIcon filled={isLiked} />
            <NumberFlow value={video.likes}
              style={{ width: Math.max(1, Math.ceil(video.likes / 10)) + 'ch' }} className="text-sm font-medium" />
          </button>

          {/* Share */}
          <button className="flex items-center gap-2 px-4 py-2 bg-(--color-bg-secondary) rounded-full hover:bg-(--color-bg-hover) transition-colors">
            <ShareIcon />
            <span className="text-sm font-medium">Share</span>
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

      >
        <div className="flex items-center gap-2 text-sm font-medium text-(--color-text-primary) mb-1">
          <span>{formatViews(video.views)} views</span>
        </div>
        <p
          className={`text-sm text-(--color-text-primary)`}
        >
          {description}
        </p>

      </div>
    </div>
  );
}
