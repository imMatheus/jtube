import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DataProvider } from "./contexts/DataContext";
import { CaptchaProvider } from "./contexts/CaptchaContext";
import { PostHogProvider } from 'posthog-js/react'
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2025-11-30',
} as const

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}>
        <QueryClientProvider client={queryClient}>
          <CaptchaProvider>
            <DataProvider>
              <ThemeProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </ThemeProvider>
            </DataProvider>
          </CaptchaProvider>
        </QueryClientProvider>
      </PostHogProvider>
    </HelmetProvider>
  </StrictMode>
);
