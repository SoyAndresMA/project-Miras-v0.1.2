import { CasparServerRepository } from '@/app/api/repositories/caspar-server.repository';
import { ItemUnionRepository } from '@/app/api/repositories/item-union.repository';
import { LoggerService } from './LoggerService';

export interface AppState {
  currentProject: any | null;
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
  menuItems: any[];
  availableUnions: any[];
  servers: any[];
  serverError: string | null;
}

export class AppInitializerService {
  private static instance: AppInitializerService;
  private logger = LoggerService.create('AppInitializerService');
  private serverRepo: CasparServerRepository;
  private unionRepo: ItemUnionRepository;

  private constructor() {
    this.serverRepo = new CasparServerRepository();
    this.unionRepo = new ItemUnionRepository();
  }

  public static getInstance(): AppInitializerService {
    if (!AppInitializerService.instance) {
      AppInitializerService.instance = new AppInitializerService();
    }
    return AppInitializerService.instance;
  }

  public async initialize(): Promise<AppState> {
    this.logger.info('Initializing application state');
    
    try {
      const [servers, unions] = await Promise.all([
        this.initializeServers(),
        this.initializeUnions()
      ]);

      return {
        currentProject: null,
        isMenuOpen: false,
        dynamicInfo: '',
        isProjectSelectorOpen: false,
        isSettingsOpen: false,
        error: null,
        loading: false,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: null,
        appVersion: 'v0.1.2',
        menuItems: this.getDefaultMenuItems(),
        availableUnions: unions,
        servers,
        serverError: null
      };
    } catch (error) {
      this.logger.error('Failed to initialize application state', { error });
      return this.getFailureState(error);
    }
  }

  private async initializeServers() {
    try {
      const servers = await this.serverRepo.findAll();
      return servers.filter(s => s.enabled);
    } catch (error) {
      this.logger.error('Failed to initialize servers', { error });
      throw error;
    }
  }

  private async initializeUnions() {
    try {
      return await this.unionRepo.findAll();
    } catch (error) {
      this.logger.error('Failed to initialize unions', { error });
      throw error;
    }
  }

  private getDefaultMenuItems() {
    return [
      // Define tus elementos de menú por defecto aquí
    ];
  }

  private getFailureState(error: any): AppState {
    return {
      currentProject: null,
      isMenuOpen: false,
      dynamicInfo: '',
      isProjectSelectorOpen: false,
      isSettingsOpen: false,
      error: 'Failed to initialize application: ' + error.message,
      loading: false,
      isSaving: false,
      hasUnsavedChanges: false,
      lastSavedAt: null,
      appVersion: 'v0.1.2',
      menuItems: [],
      availableUnions: [],
      servers: [],
      serverError: null
    };
  }
}
