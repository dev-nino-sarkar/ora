// src/store/useAppStore.ts
// Global Zustand store — locale, worker info, and app state.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, Locale } from '../i18n';

interface WorkerProfile {
  id: string;
  name: string;
  facilityCode: string;
  facilityName: string;
}

interface AppState {
  locale: Locale;
  worker: WorkerProfile | null;
  setLocale: (locale: Locale) => void;
  setWorker: (worker: WorkerProfile) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      locale: 'en',
      worker: {
        id: 'worker-001',
        name: 'Field Health Worker',
        facilityCode: 'PHC-042',
        facilityName: 'Primary Health Centre, Block A',
      },
      setLocale: (locale: Locale) => {
        i18n.locale = locale;
        set({ locale });
      },
      setWorker: (worker: WorkerProfile) => set({ worker }),
    }),
    {
      name: 'oa-scout-app-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
