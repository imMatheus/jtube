import { useState, useRef, useEffect } from "react";

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  userInitial?: string;
  autoFocus?: boolean;
  isLoading?: boolean;
}

export function CommentInput({
  onSubmit,
  onCancel,
  placeholder = "Add a comment...",
  userInitial,
  autoFocus = false,
  isLoading = false,
}: CommentInputProps) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(autoFocus);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!content.trim() || isLoading) return;
    await onSubmit(content.trim());
    setContent("");
    setIsFocused(false);
  };

  const handleCancel = () => {
    setContent("");
    setIsFocused(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="flex gap-3">
      {userInitial && (
        <div className="w-10 h-10 rounded-full bg-(--color-bg-tertiary) flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-(--color-text-primary)">
            {userInitial}
          </span>
        </div>
      )}

      <div className="flex-1">
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full bg-transparent border-b border-(--color-border-light) focus:border-(--color-text-primary) outline-none resize-none text-sm text-(--color-text-primary) placeholder:text-(--color-text-secondary) py-2 transition-colors"
          disabled={isLoading}
        />

        {isFocused && (
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-(--color-text-primary) hover:bg-(--color-bg-hover) rounded-full"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isLoading}
              className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Posting..." : "Comment"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
