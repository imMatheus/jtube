import { useState } from "react";
import { Link } from "react-router";
import { CHANNEL_AVATAR_URL } from "../../constants";
import { Avatar } from "../ui/Avatar";
import { IconButton } from "../ui/IconButton";
import { ThemeToggle } from "../ui/ThemeToggle";
import { InfoModal } from "../ui/InfoModal";
import { ProfileDropdown } from "../ui/ProfileDropdown";
import { Drawer } from "../ui/Drawer";
import { SidebarContent } from "./Sidebar";
import {
  MenuIcon,
  JTubeLogo,
  SearchIcon,
  KeyboardIcon,
  QuestionIcon,
  ChevronLeftIcon,
} from "../icons";

export function Header() {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-(--color-bg-primary) flex items-center justify-between px-4 z-50">
        {/* Mobile search overlay */}
        {isSearchOpen ? (
          <div className="flex md:hidden items-center gap-2 w-full">
            <IconButton ariaLabel="Back" onClick={() => setIsSearchOpen(false)}>
              <ChevronLeftIcon />
            </IconButton>
            <div className="flex flex-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search"
                  autoFocus
                  className="w-full h-10 bg-(--color-bg-input) border border-(--color-border) rounded-l-full px-4 text-(--color-text-primary) placeholder-(--color-text-muted) focus:outline-none focus:border-blue-500"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)">
                  <KeyboardIcon />
                </div>
              </div>
              <button className="h-10 px-5 bg-(--color-bg-secondary) border border-l-0 border-(--color-border) rounded-r-full hover:bg-(--color-bg-hover) transition-colors">
                <SearchIcon />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Left section */}
            <div className="flex items-center gap-4">
              <IconButton ariaLabel="Menu" onClick={() => setIsDrawerOpen(true)}>
                <MenuIcon />
              </IconButton>
              <Link to="/" className="flex items-center gap-1">
                <JTubeLogo />
              </Link>
            </div>

            {/* Center section - Search (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-4 flex-1 max-w-2xl mx-4">
              <div className="flex flex-1">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full h-10 bg-(--color-bg-input) border border-(--color-border) rounded-l-full px-4 pl-4 text-(--color-text-primary) placeholder-(--color-text-muted) focus:outline-none focus:border-blue-500"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)">
                    <KeyboardIcon />
                  </div>
                </div>
                <button className="h-10 px-6 bg-(--color-bg-secondary) border border-l-0 border-(--color-border) rounded-r-full hover:bg-(--color-bg-hover) transition-colors">
                  <SearchIcon />
                </button>
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search icon for mobile */}
              <IconButton ariaLabel="Search" className="md:hidden" onClick={() => setIsSearchOpen(true)}>
                <SearchIcon />
              </IconButton>
              <IconButton ariaLabel="What is this?" onClick={() => setIsInfoModalOpen(true)}>
                <QuestionIcon />
              </IconButton>
              <ThemeToggle />
              <div className="relative ml-1 sm:ml-2">
                <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="cursor-pointer">
                  <Avatar size="sm" alt="User" src={CHANNEL_AVATAR_URL} />
                </button>
                <ProfileDropdown isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
              </div>
            </div>
          </>
        )}
      </header>

      {/* Sidebar Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <div className="h-14 flex items-center gap-4 px-4 border-b border-(--color-border-light)">
          <IconButton ariaLabel="Close menu" onClick={() => setIsDrawerOpen(false)}>
            <MenuIcon />
          </IconButton>
          <Link to="/" onClick={() => setIsDrawerOpen(false)}>
            <JTubeLogo />
          </Link>
        </div>
        <div className="h-[calc(100vh-56px)] overflow-y-auto scrollbar-thin">
          <SidebarContent onItemClick={() => setIsDrawerOpen(false)} />
        </div>
      </Drawer>

      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </>
  );
}
