export interface ServerState {
    connected: boolean;
    lastError?: string;
    lastConnectionAttempt?: Date;
    lastSuccessfulConnection?: Date;
    lastErrorTime?: Date;
}

export interface ServerConfig {
    id: string;
    name: string;
    host: string;
    port: number;
    version?: string;
    autoConnect?: boolean;
    reconnectAttempts?: number;
    reconnectInterval?: number;
    commandTimeout?: number;
}

export interface ServerResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export interface ServerCommand {
    type: string;
    channel?: number;
    layer?: number;
    params?: Record<string, any>;
}

export interface ServerEvent {
    type: string;
    data: any;
    timestamp: Date;
}

export interface ConnectionOptions {
    autoReconnect?: boolean;
    maxReconnectAttempts?: number;
    reconnectInterval?: number;
    connectionTimeout?: number;
}
