import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_MODELS, ModelSlot } from '@/lib/runware/models';
import { persistStorage } from './storage';

type SettingsState = {
  models: Record<ModelSlot, string>;
  exportQuality: 'high' | 'medium' | 'low';
  saveToPhotosAutomatically: boolean;
  setModel: (slot: ModelSlot, id: string) => void;
  resetModels: () => void;
  set: (p: Partial<Pick<SettingsState, 'exportQuality' | 'saveToPhotosAutomatically'>>) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      models: { ...DEFAULT_MODELS },
      exportQuality: 'high',
      saveToPhotosAutomatically: false,
      setModel: (slot, id) => set((s) => ({ models: { ...s.models, [slot]: id } })),
      resetModels: () => set({ models: { ...DEFAULT_MODELS } }),
      set: (p) => set(p),
    }),
    {
      name: 'settings',
      storage: persistStorage,
      // new slots added in later versions get their defaults
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        return { ...current, ...p, models: { ...DEFAULT_MODELS, ...(p.models ?? {}) } };
      },
    },
  ),
);
