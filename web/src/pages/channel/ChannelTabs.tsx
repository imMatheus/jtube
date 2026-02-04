import { cn } from '../../utils';
import { SearchIcon } from '../../components/icons';

const channelTabs = [
  { id: "home", label: "Home" },
  { id: "videos", label: "Videos" },
  // { id: "shorts", label: "Shorts" },
];

interface ChannelTabsProps {
  activeTab: string;
  onTabChange?: (tabId: string) => void;
}

export function ChannelTabs({ activeTab, onTabChange }: ChannelTabsProps) {
  return (
    <div className="flex items-center border-b border-(--color-border-light)">
      <nav className="flex-1">
        <div className="flex gap-1">
          {channelTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                'px-4 sm:px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap cursor-pointer',
                activeTab === tab.id
                  ? 'text-(--color-text-primary)'
                  : 'text-(--color-text-secondary) hover:text-(--color-text-primary)'
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-(--color-text-primary) translate-y-px" />
              )}
            </button>
          ))}
        </div>
      </nav>
      <button className="p-2 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors shrink-0 hidden sm:block">
        <SearchIcon />
      </button>
    </div>
  );
}
