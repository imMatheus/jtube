import { Link, useLocation, useMatch } from "react-router";
import { cn } from "../../utils";
import {
  HomeIcon,
  ShortsIcon,
  ChevronRightIcon,
  HistoryIcon,
  PlaylistIcon,
  WatchLaterIcon,
  LikedVideosIcon,
  YourVideosIcon,
  DownloadIcon,
} from "../icons";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

function SidebarItem({
  icon,
  label,
  href = "#",
  active = false,
  onClick,
}: SidebarItemProps) {
  const className = cn(
    "flex items-center gap-6 px-3 py-2.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors",
    active && "bg-[var(--color-bg-secondary)]",
  );

  const labelClassName = cn(
    "text-sm text-(--color-text-primary) flex-1",
    active && "font-medium",
  );

  // Use Link for internal routes
  if (href.startsWith("/")) {
    return (
      <Link to={href} className={className} onClick={onClick}>
        <span className="text-(--color-text-primary)">{icon}</span>
        <span className={labelClassName}>{label}</span>
      </Link>
    );
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      <span className="text-(--color-text-primary)">{icon}</span>
      <span className={labelClassName}>{label}</span>
    </a>
  );
}

function SectionHeader({
  title,
  hasArrow = false,
}: {
  title: string;
  hasArrow?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 mt-2">
      <span className="text-base font-medium text-(--color-text-primary)">
        {title}
      </span>
      {hasArrow && <ChevronRightIcon />}
    </div>
  );
}

interface SidebarContentProps {
  onItemClick?: () => void;
}

export function SidebarContent({ onItemClick }: SidebarContentProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const isHome = pathname === "/";
  const isShorts = pathname.startsWith("/shorts");

  return (
    <nav className="py-3 px-3">
      {/* Main nav */}
      <SidebarItem
        icon={<HomeIcon active={isHome} />}
        label="Home"
        href="/"
        active={isHome}
        onClick={onItemClick}
      />
      <SidebarItem
        icon={<ShortsIcon active={isShorts} />}
        label="Shorts"
        href="/shorts"
        active={isShorts}
        onClick={onItemClick}
      />

      <div className="border-t border-(--color-border-light) my-3" />

      {/* Your JeffTube */}
      <SectionHeader title="Your JeffTube" hasArrow />
      <SidebarItem
        icon={<HistoryIcon />}
        label="History"
        onClick={onItemClick}
      />
      <SidebarItem
        icon={<PlaylistIcon />}
        label="Playlists"
        onClick={onItemClick}
      />
      <SidebarItem
        icon={<WatchLaterIcon />}
        label="Watch later"
        onClick={onItemClick}
      />
      <SidebarItem
        icon={<LikedVideosIcon />}
        label="Liked videos"
        onClick={onItemClick}
      />
      <SidebarItem
        icon={<YourVideosIcon />}
        label="Your videos"
        onClick={onItemClick}
      />
      <SidebarItem
        icon={<DownloadIcon />}
        label="Downloads"
        onClick={onItemClick}
      />



    </nav>
  );
}

export function Sidebar() {
  const isVideoPage = useMatch("/watch/:videoId");
  const isPlaylistPage = useMatch("/playlist/:playlistId/:videoId");

  if (isVideoPage || isPlaylistPage) {
    return null;
  }

  return (
    <aside className="hidden md:block fixed top-14 left-0 w-60 h-[calc(100vh-56px)] bg-(--color-bg-primary) overflow-y-auto scrollbar-thin">
      <SidebarContent />
    </aside>
  );
}
