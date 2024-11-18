import { Project } from './project';
import { MEventUnion } from './event';
import { DeviceConfig } from './device';

export interface MenuItem {
  label: string;
  action?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  submenu?: MenuItem[];
}

export interface MenuSection {
  label: string;
  submenu: MenuItem[];
}

export interface MainLayoutState {
  currentProject: Project | null;
  isMenuOpen: boolean;
  dynamicInfo: string;
  isProjectSelectorOpen: boolean;
  isSettingsOpen: boolean;
  error: string | null;
  loading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  appVersion: string;
  menuItems: MenuSection[];
  availableUnions: MEventUnion[];
  servers: DeviceConfig[];
}