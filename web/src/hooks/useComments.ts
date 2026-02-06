import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";
import { useCaptcha } from "./useCaptcha";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface CommentUser {
  id: string;
  username: string;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser;
  likes: number;
  userLike: boolean | null;
  replies: Comment[];
}

export interface CommentsResponse {
  comments: Comment[];
  totalCount: number;
}

async function fetchComments(videoId: string): Promise<CommentsResponse> {
  const response = await fetch(`${API_URL}/api/videos/${videoId}/comments`);
  if (!response.ok) {
    throw new Error("Failed to fetch comments");
  }
  return response.json();
}

async function postComment(
  videoId: string,
  content: string,
  parentId?: string,
  captchaToken?: string
): Promise<Comment> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (captchaToken) headers["X-Recaptcha-Token"] = captchaToken;
  const response = await fetch(`${API_URL}/api/videos/${videoId}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content, parentId }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Failed to post comment");
  }
  return response.json();
}

async function likeComment(commentId: string, captchaToken?: string): Promise<{ userLike: boolean | null }> {
  const headers: Record<string, string> = {};
  if (captchaToken) headers["X-Recaptcha-Token"] = captchaToken;
  const response = await fetch(`${API_URL}/api/comments/${commentId}/like`, {
    method: "POST",
    headers,
  });
  if (!response.ok) {
    throw new Error("Failed to like comment");
  }
  return response.json();
}

async function fetchCurrentUser(): Promise<CommentUser> {
  const response = await fetch(`${API_URL}/api/me`);
  if (!response.ok) {
    throw new Error("Failed to fetch user");
  }
  return response.json();
}

export function useComments(videoId: string) {
  return useQuery({
    queryKey: ["comments", videoId],
    queryFn: () => fetchComments(videoId),
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: fetchCurrentUser,
  });
}

export function usePostComment(videoId: string) {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const { getToken } = useCaptcha();

  return useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const token = await getToken("post_comment");
      return postComment(videoId, content, parentId, token);
    },
    onSuccess: (_, { parentId }) => {
      posthog.capture("comment_created", { videoId, isReply: parentId != null });
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });
}

export function useLikeComment(videoId: string) {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const { getToken } = useCaptcha();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const token = await getToken("like_comment");
      return likeComment(commentId, token);
    },
    onSuccess: (_, commentId) => {
      posthog.capture("comment_reaction", { videoId, commentId, action: "like" });
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });
}
