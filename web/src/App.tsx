import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { ChannelPage } from "./pages/channel/ChannelPage";
import { VideoPage } from "./components/video/VideoPage";
import { ShortsPage } from "./pages/shorts/ShortsPage";
import { NotFoundPage } from "./components/NotFoundPage";
import { useData } from "./hooks/useData";
import { usePostHogIdentify } from "./hooks/usePostHogIdentify";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-(--color-bg-primary) flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-(--color-text-secondary) border-t-(--color-text-primary) rounded-full animate-spin" />
        <p className="text-(--color-text-secondary)">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  const { isLoading, error } = useData();
  usePostHogIdentify();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-(--color-bg-primary) flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg">Failed to load data</p>
          <p className="text-(--color-text-secondary) mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color-bg-primary) text-(--color-text-primary)">
      <ScrollToTop />
      <Header />
      <Sidebar />
      <Routes>
        <Route path="/" element={<ChannelPage />} />
        <Route path="/watch/:videoId" element={<VideoPage />} />
        <Route path="/shorts" element={<ShortsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;
