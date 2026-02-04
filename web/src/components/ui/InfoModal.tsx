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
          JeffTube is a project showing all of Jeffery Epstein's videos. You can watch, like and comment on them.</p>

        <p className="text-(--color-text-secondary)">
          There was about 140 videos that i have removed due to them having NSFW content that i cant morally host or watch</p>


        <p className="text-(--color-text-secondary)">
          All videos are taken from <a href="https://www.justice.gov/epstein" target="_blank" rel="noopener noreferrer" className="text-(--color-link) hover:underline">DOJ</a></p>



        <p className="text-sm text-(--color-text-secondary)">
          Made by{'  '}
          <a
            href="https://x.com/whosmatu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--color-link) hover:underline"
          >
            Matheus Mendes
          </a>

        </p>
        <p className="text-sm text-(--color-text-secondary)">
          Github repository: {' '}
          <a
            href="https://github.com/imMatheus/jefftube"
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--color-link) hover:underline"
          >
            https://github.com/imMatheus/jefftube
          </a>

        </p>
      </div>
    </Modal>
  );
}
