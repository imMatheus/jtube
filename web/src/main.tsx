import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DataProvider } from "./contexts/DataContext";
import App from "./App.tsx";
import { VideoPage } from "./components/video/VideoPage";
import { ShortsPage } from "./components/shorts/ShortsPage";
import { NotFoundPage } from "./components/NotFoundPage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DataProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/watch/:videoId" element={<VideoPage />} />
            <Route path="/shorts" element={<ShortsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </DataProvider>
  </StrictMode>
);
