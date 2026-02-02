import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { useCurrentUser } from "./useComments";

export function usePostHogIdentify() {
  const posthog = usePostHog();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (user?.id) {
      posthog.identify(user.id, {
        username: user.username,
      });
    }
  }, [posthog, user?.id, user?.username]);
}
