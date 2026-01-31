import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  dislikes: number;
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
  parentId?: string
): Promise<Comment> {
  const response = await fetch(`${API_URL}/api/videos/${videoId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, parentId }),
  });
  if (!response.ok) {
    throw new Error("Failed to post comment");
  }
  return response.json();
}

async function likeComment(commentId: string): Promise<{ userLike: boolean | null }> {
  const response = await fetch(`${API_URL}/api/comments/${commentId}/like`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to like comment");
  }
  return response.json();
}

async function dislikeComment(commentId: string): Promise<{ userLike: boolean | null }> {
  const response = await fetch(`${API_URL}/api/comments/${commentId}/dislike`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to dislike comment");
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

  return useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      postComment(videoId, content, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });
}

export function useLikeComment(videoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: likeComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });
}

export function useDislikeComment(videoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dislikeComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });
}
