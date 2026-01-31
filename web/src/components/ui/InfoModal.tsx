import { Modal } from './Modal';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="What is this?">
      <div className="space-y-4 text-(--color-text-primary)">
        <p className="text-(--color-text-secondary)">
          You're browsing a YouTube channel clone.
        </p>

        <p className="text-(--color-text-secondary)">
          JTube is a demo project showcasing a YouTube channel page clone built with React and TailwindCSS.
          It features a responsive design with both light and dark mode support.
        </p>

        <p className="text-sm text-(--color-text-secondary)">
          Made by{' '}
          <a
            href="https://x.com/whosmatu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--color-link) hover:underline"
          >
            Matheus Mendes
          </a>

        </p>
      </div>
    </Modal>
  );
}
