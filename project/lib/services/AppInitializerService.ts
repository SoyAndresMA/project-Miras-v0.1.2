import { CasparServerRepository } from '@/app/api/repositories/caspar-server.repository';
import { ItemUnionRepository } from '@/app/api/repositories/item-union.repository';
import { LoggerService } from '@/lib/services/logger.service';

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
  private logger = LoggerService.create('AppInitializerService');
  private serverRepo: CasparServerRepository;
  private unionRepo: ItemUnionRepository;

  constructor() {
    this.serverRepo = new CasparServerRepository();
    this.unionRepo = new ItemUnionRepository();
  }

  public async initialize(): Promise<AppState> {
    this.logger.info('Starting application initialization');
    
    try {
      this.logger.debug('Initializing servers and unions in parallel');
      const [servers, unions] = await Promise.all([
        this.initializeServers(),
        this.initializeUnions()
      ]);

      this.logger.info('Application initialization completed successfully');
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
        appVersion: process.env.APP_VERSION || 'v0.1.2',
        menuItems: this.getDefaultMenuItems(),
        availableUnions: unions,
        servers,
        serverError: null
      };
    } catch (error) {
      this.logger.error('Failed to initialize application state', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined 
      });
      return this.getFailureState(error);
    }
  }

  private async initializeServers() {
    this.logger.debug('Starting server initialization');
    try {
      const servers = await this.serverRepo.findAll();
      const enabledServers = servers.filter(s => s.enabled);
      this.logger.info('Server initialization completed', { 
        totalServers: servers.length,
        enabledServers: enabledServers.length 
      });
      return enabledServers;
    } catch (error) {
      this.logger.error('Failed to initialize servers', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  private async initializeUnions() {
    this.logger.debug('Starting unions initialization');
    try {
      const unions = await this.unionRepo.findAll();
      this.logger.info('Unions initialization completed', { totalUnions: unions.length });
      return unions;
    } catch (error) {
      this.logger.error('Failed to initialize unions', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  private getDefaultMenuItems() {
    return [
      {
        id: 'home',
        label: 'Home',
        icon: 'home',
        path: '/',
        disabled: false
      },
      {
        id: 'projects',
        label: 'Projects',
        icon: 'folder',
        path: '/projects',
        disabled: false
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: 'settings',
        path: '/settings',
        disabled: false
      }
    ];
  }

  private getFailureState(error: any): AppState {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      currentProject: null,
      isMenuOpen: false,
      dynamicInfo: '',
      isProjectSelectorOpen: false,
      isSettingsOpen: false,
      error: `Failed to initialize application: ${errorMessage}`,
      loading: false,
      isSaving: false,
      hasUnsavedChanges: false,
      lastSavedAt: null,
      appVersion: process.env.APP_VERSION || 'v0.1.2',
      menuItems: [],
      availableUnions: [],
      servers: [],
      serverError: errorMessage
    };
  }
}
