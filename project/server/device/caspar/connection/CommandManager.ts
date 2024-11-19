import { EventEmitter } from 'events';
import { AMCPResponse, CommandQueueItem } from '../types';
import { Logger } from '../utils/Logger';
import { Parser } from '../utils/Parser';

interface PendingCommand {
  command: string;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  timestamp: number;
}

export class CommandManager extends EventEmitter {
  private pendingCommands: Map<string, PendingCommand> = new Map();
  private responseBuffer: string = '';
  private commandCounter: number = 0;

  constructor(
    private logger: Logger,
    private timeout: number = 5000
  ) {
    super();
  }

  async sendCommand(command: string, args: string[] = []): Promise<AMCPResponse> {
    // Formatear los argumentos según el protocolo AMCP
    const formattedArgs = args.map(arg => {
      // Si el argumento contiene espacios, encerrarlo en comillas
      if (arg.includes(' ')) {
        // Escapar caracteres especiales
        const escaped = arg
          .replace(/\\/g, '\\\\')  // Escapar backslash
          .replace(/"/g, '\\"')    // Escapar comillas
          .replace(/\n/g, '\\n');  // Escapar nueva línea
        return `"${escaped}"`;
      }
      return arg;
    });

    // Construir el comando AMCP
    const fullCommand = [command.toUpperCase(), ...formattedArgs].join(' ');
    
    // Añadir CRLF según el protocolo
    const commandString = `${fullCommand}\r\n`;
    
    this.logger.debug(` Enviando comando: ${fullCommand}`);

    return new Promise<AMCPResponse>((resolve, reject) => {
      const commandId = (++this.commandCounter).toString();
      
      // Configurar timeout
      const timeoutId = setTimeout(() => {
        if (this.pendingCommands.has(commandId)) {
          const error = new Error(`Timeout en comando [${commandId}]: ${command}`);
          this.logger.error(' ', error.message);
          this.pendingCommands.delete(commandId);
          reject(error);
        }
      }, this.timeout);

      // Guardar el comando pendiente
      this.pendingCommands.set(commandId, {
        command,
        resolve,
        reject,
        timeout: timeoutId,
        timestamp: Date.now()
      });

      // Emitir el comando para ser enviado
      this.emit('command', commandString);
    });
  }

  handleData(data: Buffer): void {
    // Añadir los datos al buffer
    this.responseBuffer += data.toString();

    // Procesar líneas completas (terminadas en CRLF)
    while (this.responseBuffer.includes('\r\n')) {
      const lineEndIndex = this.responseBuffer.indexOf('\r\n');
      const line = this.responseBuffer.substring(0, lineEndIndex);
      this.responseBuffer = this.responseBuffer.substring(lineEndIndex + 2);

      this.handleResponseLine(line);
    }
  }

  private handleResponseLine(line: string): void {
    this.logger.debug(` Respuesta recibida: ${line}`);

    // Manejar respuesta de VERSION específicamente
    if (line.startsWith('201 VERSION')) {
      const response: AMCPResponse = {
        code: 201,
        status: 'OK',
        data: line.substring(4).trim()
      };
      this.handleSuccessResponse(response);
      return;
    }

    // Parsear la respuesta según el protocolo AMCP
    const match = line.match(/^(\d{3})\s+((?:OK|ERROR|FAILED)(?:\s+(.+))?)/i);
    
    if (!match) {
      // Acumular datos adicionales para el comando actual
      const [commandId] = this.findOldestPendingCommand();
      if (commandId && line.trim()) {
        const pending = this.pendingCommands.get(commandId);
        if (pending) {
          const response: AMCPResponse = {
            code: 200,
            status: 'OK',
            data: line.trim()
          };
          this.handleSuccessResponse(response);
        }
      }
      return;
    }

    const [, code, status, data] = match;
    const response: AMCPResponse = {
      code: parseInt(code),
      status: status.toUpperCase(),
      data: data || ''
    };

    // Clasificar el código de respuesta
    const codeType = Math.floor(response.code / 100);
    switch (codeType) {
      case 1: // 100-199: Información
        this.logger.info(` ${response.data}`);
        break;
      case 2: // 200-299: Éxito
        this.handleSuccessResponse(response);
        break;
      case 4: // 400-499: Error de cliente
        this.handleClientError(response);
        break;
      case 5: // 500-599: Error de servidor
        this.handleServerError(response);
        break;
      default:
        this.logger.warn(` Código de respuesta desconocido: ${response.code}`);
    }
  }

  private handleSuccessResponse(response: AMCPResponse): void {
    // Buscar el comando pendiente más antiguo
    const [commandId] = this.findOldestPendingCommand();
    
    if (commandId) {
      const pending = this.pendingCommands.get(commandId)!;
      clearTimeout(pending.timeout);
      this.pendingCommands.delete(commandId);
      pending.resolve(response);
    }
  }

  private handleClientError(response: AMCPResponse): void {
    const [commandId, pending] = this.findOldestPendingCommand();
    
    if (commandId && pending) {
      clearTimeout(pending.timeout);
      this.pendingCommands.delete(commandId);
      
      const error = new Error(`Error de cliente: ${response.data || 'Error desconocido'}`);
      error.name = 'AMCPClientError';
      pending.reject(error);
    }
  }

  private handleServerError(response: AMCPResponse): void {
    const [commandId, pending] = this.findOldestPendingCommand();
    
    if (commandId && pending) {
      clearTimeout(pending.timeout);
      this.pendingCommands.delete(commandId);
      
      const error = new Error(`Error de servidor: ${response.data || 'Error interno'}`);
      error.name = 'AMCPServerError';
      pending.reject(error);
    }
  }

  private findOldestPendingCommand(): [string, PendingCommand] | [null, null] {
    let oldestId: string | null = null;
    let oldestCommand: PendingCommand | null = null;
    let oldestTime = Infinity;

    for (const [id, command] of this.pendingCommands.entries()) {
      if (command.timestamp < oldestTime) {
        oldestId = id;
        oldestCommand = command;
        oldestTime = command.timestamp;
      }
    }

    return oldestId && oldestCommand ? [oldestId, oldestCommand] : [null, null];
  }

  clearPendingCommands(): void {
    for (const [id, pending] of this.pendingCommands.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Comando cancelado'));
    }
    this.pendingCommands.clear();
  }

  parseChannelInfo(info: string): any[] {
    return Parser.parseChannelInfo(info);
  }
}

interface AMCPResponse {
  code: number;
  status: 'OK' | 'ERROR';
  data: string;
}
