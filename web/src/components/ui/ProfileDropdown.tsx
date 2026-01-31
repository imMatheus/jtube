import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { Avatar } from "./Avatar";
import { SettingsIcon, SignOutIcon } from "../icons";
import { CHANNEL_AVATAR_URL } from "../../constants";

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDropdown({ isOpen, onClose }: ProfileDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-12 right-0 w-72 bg-(--color-bg-elevated) rounded-xl shadow-lg border border-(--color-border-light) overflow-hidden z-50"
    >
      {/* Profile header */}
      <div className="p-4 flex gap-3">
        <Avatar src={CHANNEL_AVATAR_URL} size="lg" alt="Jeffery Epstein" />
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-(--color-text-primary) font-medium truncate">
            Jeffery Epstein
          </span>
          <span className="text-(--color-text-secondary) text-sm truncate">
            @jefferyepstein
          </span>
          <Link
            to="/"
            onClick={onClose}
            className="text-blue-500 text-sm mt-1 hover:text-blue-400"
          >
            View your channel
          </Link>
        </div>
      </div>

      <div className="border-t border-(--color-border-light)" />

      {/* Menu options */}
      <div className="py-2">
        <button className="w-full px-4 py-2 flex items-center gap-4 hover:bg-(--color-bg-hover) transition-colors cursor-pointer">
          <SettingsIcon />
          <span className="text-(--color-text-primary) text-sm">Settings</span>
        </button>
        <button className="w-full px-4 py-2 flex items-center gap-4 hover:bg-(--color-bg-hover) transition-colors cursor-pointer">
          <SignOutIcon />
          <span className="text-(--color-text-primary) text-sm">Sign out</span>
        </button>
      </div>
    </div>
  );
}
