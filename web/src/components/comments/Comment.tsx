import { useState } from "react";
import NumberFlow from "@number-flow/react";
import type { Comment as CommentType } from "../../hooks/useComments";
import {
  useLikeComment,
  useDislikeComment,
  usePostComment,
} from "../../hooks/useComments";
import { CommentInput } from "./CommentInput";
import { LikeIcon, DislikeIcon } from "../icons";

interface CommentProps {
  comment: CommentType;
  videoId: string;
  isReply?: boolean;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
  return `${Math.floor(seconds / 31536000)} years ago`;
}

function getInitial(username: string): string {
  // Username is like @user-abc123, get the first letter after @
  if (username.startsWith("@")) {
    return username[1]?.toUpperCase() || "?";
  }
  return username[0]?.toUpperCase() || "?";
}

export function Comment({ comment, videoId, isReply = false }: CommentProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const likeComment = useLikeComment(videoId);
  const dislikeComment = useDislikeComment(videoId);
  const postComment = usePostComment(videoId);

  const handleLike = () => {
    likeComment.mutate(comment.id);
  };

  const handleDislike = () => {
    dislikeComment.mutate(comment.id);
  };

  const handleReply = async (content: string) => {
    await postComment.mutateAsync({ content, parentId: comment.id });
    setShowReplyInput(false);
    setShowReplies(true);
  };

  const replyCount = comment.replies?.length || 0;

  return (
    <div className={`flex gap-3 ${isReply ? "ml-12" : ""}`}>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-(--color-bg-tertiary) flex items-center justify-center shrink-0">
        <span className="text-sm font-medium text-(--color-text-primary)">
          {getInitial(comment.user.username)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-(--color-text-primary)">
            {comment.user.username}
          </span>
          <span className="text-xs text-(--color-text-secondary)">
            {formatTimeAgo(comment.createdAt)}
          </span>
        </div>

        {/* Comment text */}
        <p className="text-sm text-(--color-text-primary) mt-1 whitespace-pre-wrap">
          {comment.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 p-1.5 rounded-full hover:bg-(--color-bg-hover) ${comment.userLike === true ? "text-blue-500" : "text-(--color-text-secondary)"
                }`}
            >
              <LikeIcon className="w-4 h-4" filled={comment.userLike === true} />
            </button>

            <NumberFlow value={comment.likes}
              style={{ width: Math.max(1, Math.ceil(comment.likes / 10)) + 'ch' }}
              className="text-xs text-(--color-text-secondary)" />

          </div>

          <div className="flex items-center">
            <button
              onClick={handleDislike}
              className={`p-1.5 rounded-full hover:bg-(--color-bg-hover) ${comment.userLike === false ? "text-blue-500" : "text-(--color-text-secondary)"
                }`}
            >
              <DislikeIcon className="w-4 h-4" filled={comment.userLike === false} />
            </button>
            <NumberFlow value={comment.dislikes}
              style={{ width: Math.max(1, Math.ceil(comment.dislikes / 10)) + 'ch' }}
              className="text-xs text-(--color-text-secondary)" />
          </div>

          {!isReply && (
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-xs font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) px-3 py-1.5 rounded-full hover:bg-(--color-bg-hover)"
            >
              Reply
            </button>
          )}


        </div>

        {/* Reply input */}
        {showReplyInput && (
          <div className="mt-3">
            <CommentInput
              onSubmit={handleReply}
              onCancel={() => setShowReplyInput(false)}
              placeholder={`Reply to ${comment.user.username}...`}
              autoFocus
              isLoading={postComment.isPending}
            />
          </div>
        )}

        {/* Replies toggle */}
        {!isReply && replyCount > 0 && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-2 mt-2 text-sm font-medium text-blue-500 hover:bg-blue-500/10 px-3 py-1.5 rounded-full -ml-3"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showReplies ? "rotate-180" : ""}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </button>
        )}

        {/* Replies list */}
        {showReplies && comment.replies && (
          <div className="mt-3 space-y-4">
            {comment.replies.map((reply) => (
              <Comment
                key={reply.id}
                comment={reply}
                videoId={videoId}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
