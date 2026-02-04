import { useRef, useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { ShortVideo } from "./ShortVideo";
import { useData } from "../../hooks/useData";
import { NavUpIcon, NavDownIcon } from "../../components/icons";

export function ShortsPage() {
  const { randomSortedShorts: videos } = useData();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Virtualization: only render videos within range
  const BUFFER_SIZE = 2;
  const virtualizedVideos = useMemo(() => {
    const start = Math.max(0, activeIndex - BUFFER_SIZE);
    const end = Math.min(videos.length, activeIndex + BUFFER_SIZE + 1);

    return videos.slice(start, end).map((video, i) => ({
      video,
      originalIndex: start + i,
    }));
  }, [videos, activeIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / itemHeight);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < videos.length) {
        setActiveIndex(newIndex);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeIndex, videos.length]);

  const scrollToIndex = (index: number) => {
    const container = containerRef.current;
    if (!container || index < 0 || index >= videos.length) return;

    const itemHeight = container.clientHeight;
    container.scrollTo({ top: index * itemHeight, behavior: "smooth" });
  };

  const goNext = () => scrollToIndex(activeIndex + 1);
  const goPrev = () => scrollToIndex(activeIndex - 1);

  // Calculate the height for spacers
  const itemHeight = typeof window !== "undefined" ? window.innerHeight - 56 : 0;

  return (
    <>
      <Helmet>
        <title>Shorts - JeffTube</title>
        <meta name="description" content="Watch short videos on JeffTube" />
        <meta property="og:title" content="Shorts - JeffTube" />
        <meta property="og:description" content="Watch short videos on JeffTube" />
        <meta property="og:type" content="website" />
      </Helmet>
      <main
        ref={containerRef}
        className="lg:ml-60 mt-14 h-[calc(100vh-56px)] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {/* Top spacer for virtualization */}
        {activeIndex > BUFFER_SIZE && (
          <div style={{ height: (activeIndex - BUFFER_SIZE) * itemHeight }} />
        )}

        {/* Render only virtualized videos */}
        {virtualizedVideos.map(({ video, originalIndex }) => (
          <ShortVideo
            key={video.id}
            video={video}
            isActive={originalIndex === activeIndex}
          />
        ))}

        {/* Bottom spacer for virtualization */}
        {activeIndex < videos.length - BUFFER_SIZE - 1 && (
          <div
            style={{
              height: (videos.length - activeIndex - BUFFER_SIZE - 1) * itemHeight,
            }}
          />
        )}
      </main>

      {/* Navigation buttons - hidden on mobile */}
      <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col gap-3 z-50">
        <button
          onClick={goPrev}
          disabled={activeIndex === 0}
          className="w-12 h-12 rounded-full bg-(--color-bg-secondary) hover:bg-(--color-bg-hover) disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          <NavUpIcon />
        </button>
        <button
          onClick={goNext}
          disabled={activeIndex === videos.length - 1}
          className="w-12 h-12 rounded-full bg-(--color-bg-secondary) hover:bg-(--color-bg-hover) disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          <NavDownIcon />
        </button>
      </div>
    </>
  );
}
