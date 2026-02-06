import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";
import { useCaptcha } from "./useCaptcha";

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

async function likeVideo(videoId: string, captchaToken?: string): Promise<VideoLikeResponse> {
  const headers: Record<string, string> = {};
  if (captchaToken) headers["X-Recaptcha-Token"] = captchaToken;
  const response = await fetch(`${API_URL}/api/videos/${videoId}/like`, {
    method: "POST",
    headers,
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
  const { getToken } = useCaptcha();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken("like_video");
      return likeVideo(videoId, token);
    },
    onSuccess: () => {
      posthog.capture("video_reaction", { videoId, action: "like" });
      queryClient.invalidateQueries({ queryKey: ["videoLike", videoId] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}
