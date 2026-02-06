import { useCallback, type ReactNode } from "react";
import {
    GoogleReCaptchaProvider,
    useGoogleReCaptcha,
} from "react-google-recaptcha-v3";
import { CaptchaContext } from "../hooks/useCaptcha";


function CaptchaInner({ children }: { children: ReactNode }) {
    const { executeRecaptcha } = useGoogleReCaptcha();

    const getToken = useCallback(
        async (action = "submit") => {
            if (!executeRecaptcha) return undefined;
            return executeRecaptcha(action);
        },
        [executeRecaptcha]
    );

    return (
        <CaptchaContext.Provider value={{ getToken }}>
            {children}
        </CaptchaContext.Provider>
    );
}

export function CaptchaProvider({ children }: { children: ReactNode }) {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    if (!siteKey) {
        return (
            <CaptchaContext.Provider value={{ getToken: async () => undefined }}>
                {children}
            </CaptchaContext.Provider>
        );
    }

    return (
        <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
            <CaptchaInner>{children}</CaptchaInner>
        </GoogleReCaptchaProvider>
    );
}

