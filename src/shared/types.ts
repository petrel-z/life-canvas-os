import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'

import type { registerRoute } from 'lib/electron-router-dom'

export type BrowserWindowOrNull = Electron.BrowserWindow | null

type Route = Parameters<typeof registerRoute>[0]

export interface WindowProps extends Electron.BrowserWindowConstructorOptions {
  id: Route['id']
  query?: Route['query']
}

export interface WindowCreationByIPC {
  channel: string
  window(): BrowserWindowOrNull
  callback(window: BrowserWindow, event: IpcMainInvokeEvent): void
}

// UI Business Types
export enum DimensionType {
  FUEL = 'FUEL',
  PHYSICAL = 'PHYSICAL',
  INTELLECTUAL = 'INTELLECTUAL',
  OUTPUT = 'OUTPUT',
  RECOVERY = 'RECOVERY',
  ASSET = 'ASSET',
  CONNECTION = 'CONNECTION',
  ENVIRONMENT = 'ENVIRONMENT'
}

export interface DimensionInfo {
  type: DimensionType;
  label: string;
  icon: string;
  color: string;
}

export interface Deviation {
  id: string;
  timestamp: number;
  description: string;
  calories?: number;
  type: 'excess' | 'deficit' | 'other';
}

export interface FuelSystemData {
  baseline: string;
  deviations: Deviation[];
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  content: string;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  tags: string[];
  attachments: string[];
  dimensionRefs?: DimensionType[];
}

export interface AppState {
  user: {
    name: string;
    birthday: string;
    mbti: string;
    values: string[];
    lifespan: number;
  };
  dimensions: Record<DimensionType, number>;
  fuelSystem: FuelSystemData;
  journals: JournalEntry[];
  isLocked: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  aiConfig: {
    provider: 'DeepSeek' | 'Doubao';
    apiKey: string;
    frequencyLimit: number;
  };
  systemConfig: {
    autoSaveInterval: number; // 秒
    notificationsEnabled: boolean;
  };
}
