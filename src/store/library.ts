import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MediaKind } from '@/ui/theme';
import { persistStorage } from './storage';

export type AssetSource = 'import' | 'edit' | 'ai-edit' | 'generated' | 'recording';
export type Asset = {
  id: string;
  kind: MediaKind;
  uri: string; // local file uri (document dir) or remote url
  thumbUri?: string;
  title: string;
  createdAt: number;
  source: AssetSource;
  prompt?: string;
  model?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  parentId?: string; // asset it was derived from
};

type LibraryState = {
  assets: Asset[];
  add: (a: Omit<Asset, 'id' | 'createdAt'> & { id?: string; createdAt?: number }) => Asset;
  update: (id: string, patch: Partial<Asset>) => void;
  remove: (id: string) => void;
  get: (id: string) => Asset | undefined;
};

const id = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      assets: [],
      add: (a) => {
        const asset: Asset = { ...a, id: a.id ?? id(), createdAt: a.createdAt ?? Date.now() };
        set((s) => ({ assets: [asset, ...s.assets] }));
        return asset;
      },
      update: (aid, patch) => set((s) => ({ assets: s.assets.map((x) => (x.id === aid ? { ...x, ...patch } : x)) })),
      remove: (aid) => set((s) => ({ assets: s.assets.filter((x) => x.id !== aid) })),
      get: (aid) => get().assets.find((x) => x.id === aid),
    }),
    { name: 'library', storage: persistStorage },
  ),
);
