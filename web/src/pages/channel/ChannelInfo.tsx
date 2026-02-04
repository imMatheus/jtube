import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { VerifiedIcon, BellIcon, ChevronDownIcon } from "../../components/icons";

interface ChannelInfoProps {
  name: string;
  handle: string;
  videoCount: number;
  description: string;
  avatar?: string;
  verified?: boolean;
}

const links: { label: string, url: string }[] = [];

export function ChannelInfo({
  name,
  handle,
  videoCount,
  description,
  avatar,
  verified = false,
}: ChannelInfoProps) {
  return (
    <div className="flex gap-3 sm:gap-6 py-4">
      <div className="shrink-0">
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-40 md:h-40">
          <Avatar src={avatar} alt={name} size="full" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-(--color-text-primary) truncate">
            {name}
          </h1>
          {verified && (
            <span className="text-(--color-text-secondary) shrink-0">
              <VerifiedIcon />
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 text-xs sm:text-sm text-(--color-text-secondary) mt-0.5 sm:mt-1">
          <span>{handle}</span>
          <span>•</span>
          <span>{videoCount} videos</span>
        </div>
        <p className="text-xs sm:text-sm text-(--color-text-secondary) mt-1 sm:mt-2 line-clamp-1">
          {description}

        </p>
        {links.length > 0 && (
          <div className="flex items-center gap-1 text-xs sm:text-sm mt-1">
            <a
              href={links[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--color-link) hover:opacity-80"
            >
              {links[0].label}
            </a>
            {links.length > 1 && (
              <span className="text-(--color-text-secondary)">
                and {links.length - 1} more link{links.length > 2 ? "s" : ""}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 sm:mt-4">
          <Button variant="subscribe" icon={<BellIcon />} className="text-sm">
            Subscribed
            <ChevronDownIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
