import { useState } from "react";
import {
  useComments,
  useCurrentUser,
  usePostComment,
} from "../../hooks/useComments";
import { Comment } from "./Comment";
import { CommentInput } from "./CommentInput";
import { formatViews } from "../../utils";
import { SortIcon } from "../icons";

interface CommentSectionProps {
  videoId: string;
}

export function CommentSection({ videoId }: CommentSectionProps) {
  const { data, isLoading } = useComments(videoId);
  const { data: currentUser } = useCurrentUser();
  const postComment = usePostComment(videoId);
  const [sortBy, setSortBy] = useState<"top" | "newest">("top");

  const handleSubmitComment = async (content: string) => {
    await postComment.mutateAsync({ content });
  };

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="animate-pulse">
          <div className="h-6 bg-(--color-bg-secondary) rounded w-40 mb-6" />
          <div className="h-10 bg-(--color-bg-secondary) rounded mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-10 h-10 bg-(--color-bg-secondary) rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-(--color-bg-secondary) rounded w-32 mb-2" />
                  <div className="h-4 bg-(--color-bg-secondary) rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const comments = data?.comments || [];
  const totalCount = data?.totalCount || 0;

  // Sort comments
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === "top") {
      return b.likes - a.likes;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center gap-6 mb-6">
        <h2 className="text-xl font-bold text-(--color-text-primary)">
          {formatViews(totalCount)} Comments
        </h2>
        <button
          className="flex cursor-pointer items-center gap-2 text-sm"
          onClick={() => setSortBy(sortBy === "top" ? "newest" : "top")}
        >
          <SortIcon />
          <span className="text-(--color-text-secondary) hover:text-(--color-text-primary)">Sort by: {sortBy === "top" ? "Top comments" : "Newest first"}</span>
        </button>
      </div>

      {/* Comment input */}
      <CommentInput
        onSubmit={handleSubmitComment}
        placeholder="Add a comment..."
        userInitial={currentUser?.username?.[1]?.toUpperCase() || "?"}
        isLoading={postComment.isPending}
      />
      {postComment.isError && (
        <p className="text-sm text-red-500 mt-2">{postComment.error.message}</p>
      )}

      {/* Comments list */}
      <div className="mt-6 space-y-4">
        {sortedComments.map((comment) => (
          <Comment key={comment.id} comment={comment} videoId={videoId} />
        ))}
      </div>

      {comments.length === 0 && (
        <p className="text-center text-(--color-text-secondary) py-8">
          No comments yet. Be the first to comment!
        </p>
      )}
    </div>
  );
}
