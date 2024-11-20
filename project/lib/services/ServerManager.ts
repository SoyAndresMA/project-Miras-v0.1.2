import { EventEmitter } from 'events';
import { CasparServer } from '@/server/device/caspar/CasparServer';
import { DeviceConfig } from '@/lib/types/device';
import { CasparServerRepository } from '@/lib/repositories/caspar-server.repository';

interface ServerState {
  connected: boolean;
  loading: boolean;
  error: string | null;
}

type StateListener = (state: ServerState) => void;

export class ServerManager {
  private static instance: ServerManager;
  private servers: Map<string, CasparServer>;
  private states: Map<string, ServerState>;
  private listeners: Map<string, Set<StateListener>>;
  private eventEmitter: EventEmitter;
  private repository: CasparServerRepository;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.servers = new Map();
    this.states = new Map();
    this.listeners = new Map();
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(100);
    this.repository = new CasparServerRepository();
  }

  static getInstance(): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager();
    }
    return ServerManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const servers = await this.repository.findAll();
      for (const config of servers) {
        if (!config.enabled) continue;
        await this.initializeServer(config);
      }
    } catch (error) {
      console.error('Error initializing servers:', error);
      throw error;
    }
  }

  private async initializeServer(config: DeviceConfig): Promise<void> {
    const serverId = config.id.toString();
    
    // Actualizar estado a loading
    this.updateState(serverId, {
      connected: false,
      loading: true,
      error: null
    });

    try {
      const server = CasparServer.getInstance(config);
      await server.initialize();
      
      this.servers.set(serverId, server);
      
      // Actualizar estado a conectado
      this.updateState(serverId, {
        connected: true,
        loading: false,
        error: null
      });

      // Configurar listeners para el servidor
      server.on('error', (error) => {
        this.updateState(serverId, {
          connected: false,
          loading: false,
          error: error.message
        });
      });

      server.on('connected', () => {
        this.updateState(serverId, {
          connected: true,
          loading: false,
          error: null
        });
      });

    } catch (error) {
      // Actualizar estado a error
      this.updateState(serverId, {
        connected: false,
        loading: false,
        error: error.message
      });
      throw error;
    }
  }

  private updateState(serverId: string, newState: ServerState): void {
    this.states.set(serverId, newState);
    const listeners = this.listeners.get(serverId);
    if (listeners) {
      listeners.forEach(listener => listener(newState));
    }
    this.eventEmitter.emit('serverStateChanged', { serverId, state: newState });
  }

  getServer(serverId: string): CasparServer | undefined {
    return this.servers.get(serverId);
  }

  getState(serverId: string): ServerState | undefined {
    return this.states.get(serverId);
  }

  addStateListener(serverId: string, listener: StateListener): void {
    if (!this.listeners.has(serverId)) {
      this.listeners.set(serverId, new Set());
    }
    this.listeners.get(serverId)!.add(listener);
  }

  removeStateListener(serverId: string, listener: StateListener): void {
    const listeners = this.listeners.get(serverId);
    if (listeners) {
      listeners.delete(listener);
    }
  }
}