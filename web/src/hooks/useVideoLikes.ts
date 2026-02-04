import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface VideoLikeResponse {
  userLike: boolean | null;
}

async function fetchVideoLike(videoId: string): Promise<VideoLikeResponse> {
  const response = await fetch(`${API_URL}/api/videos/${videoId}/like`);
  if (!response.ok) {
    throw new Error("Failed to fetch video like status");
  }
  return response.json();
}

async function likeVideo(videoId: string): Promise<VideoLikeResponse> {
  const response = await fetch(`${API_URL}/api/videos/${videoId}/like`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to like video");
  }
  return response.json();
}

export function useVideoLike(videoId: string) {
  return useQuery({
    queryKey: ["videoLike", videoId],
    queryFn: () => fetchVideoLike(videoId),
  });
}

export function useLikeVideo(videoId: string) {
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  return useMutation({
    mutationFn: () => likeVideo(videoId),
    onSuccess: () => {
      posthog.capture("video_reaction", { videoId, action: "like" });
      queryClient.invalidateQueries({ queryKey: ["videoLike", videoId] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}
