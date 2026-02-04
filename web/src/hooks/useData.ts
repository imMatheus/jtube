import { createContext, useContext } from 'react';

export interface Video {
  id: string;
  title: string;
  filename: string;
  length: number;
  views: number;
  likes: number;
  hasThumbnail: boolean;
  is_shorts: boolean;
  playlist: string | null;
  commentCount?: number;
}

export interface DataContextType {
  videos: Video[];
  randomSortedShorts: Video[];
  isLoading: boolean;
  error: Error | null;
  trackView: (videoId: string) => Promise<void>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
