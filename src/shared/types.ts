import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'

export type BrowserWindowOrNull = Electron.BrowserWindow | null

// Window management types for IPC window creation
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
  title?: string;
  content: string;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  tags: string[];
  attachments: string[];
  linkedDimensions?: DimensionType[];
  isPrivate?: boolean;
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
    modelName: string;
    frequencyLimit: number;
  };
  systemConfig: {
    autoSaveInterval: number; // 秒
    notificationsEnabled: boolean;
  };
}
