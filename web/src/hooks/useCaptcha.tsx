import { createContext, useContext } from "react";

interface CaptchaContextValue {
  getToken: (action?: string) => Promise<string | undefined>;
}

export const CaptchaContext = createContext<CaptchaContextValue>({
  getToken: async () => undefined,
});

export function useCaptcha() {
  return useContext(CaptchaContext);
}
