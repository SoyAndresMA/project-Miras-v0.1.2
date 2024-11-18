import { EventEmitter } from 'events';
import { AMCPResponse, CommandQueueItem } from '../types';
import { Logger } from '../utils/Logger';
import { Parser } from '../utils/Parser';

export class CommandManager extends EventEmitter {
  private pendingCommands: Map<string, CommandQueueItem> = new Map();
  private responseBuffer: string = '';
  private commandTimeout: number;
  private commandId: number = 0;

  constructor(
    private logger: Logger,
    commandTimeout: number = 5000
  ) {
    super();
    this.commandTimeout = commandTimeout;
  }

  async sendCommand(command: string): Promise<AMCPResponse> {
    const commandId = ++this.commandId;
    const fullCommand = `${commandId} ${command}`;
    
    // Asegurarse de que el comando termina con \r\n
    const normalizedCommand = command.endsWith('\r\n') ? command : command + '\r\n';
    
    this.logger.debug(` Enviando comando [${commandId}]: ${command.trim()}`);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (this.pendingCommands.has(commandId.toString())) {
          this.pendingCommands.delete(commandId.toString());
          reject(new Error(`Command timeout: ${command.trim()}`));
        }
      }, this.commandTimeout);

      this.pendingCommands.set(commandId.toString(), {
        resolve,
        reject,
        command: command.trim(),
        timeout: timeoutId,
        timestamp: Date.now()
      });

      this.emit('command', normalizedCommand);
    });
  }

  handleData(data: Buffer): void {
    this.responseBuffer += data.toString();

    // Procesar línea por línea
    const lines = this.responseBuffer.split('\r\n');
    this.responseBuffer = lines.pop() || ''; // Mantener la última línea incompleta

    for (const line of lines) {
      if (line.trim()) {
        this.processResponseLine(line);
      }
    }
  }

  private processResponseLine(line: string): void {
    try {
      const response = Parser.parseResponse(line);
      if (response) {
        this.handleResponse(response);
      }
    } catch (error) {
      this.logger.error('Error parsing response:', error);
    }
  }

  private handleResponse(response: AMCPResponse): void {
    this.logger.debug(` Respuesta recibida: ${JSON.stringify(response)}`);

    // Extraer el ID del comando de la respuesta si existe
    const match = response.data.match(/^(\d+)\s/);
    const commandId = match ? match[1] : null;
    
    // Si tenemos un ID, intentar emparejar con un comando pendiente
    if (commandId && this.pendingCommands.has(commandId)) {
      const pending = this.pendingCommands.get(commandId)!;
      clearTimeout(pending.timeout);
      this.pendingCommands.delete(commandId);

      // Limpiar el ID del comando de la respuesta
      response.data = response.data.replace(/^\d+\s/, '').trim();

      if (response.code >= 400) {
        pending.reject(new Error(`Command failed: ${response.data}`));
      } else {
        pending.resolve(response);
      }
    } else {
      // Si no hay ID o no coincide con ningún comando pendiente,
      // intentar emparejar con el comando más antiguo
      const pendingCommands = Array.from(this.pendingCommands.entries());
      if (pendingCommands.length > 0) {
        // Ordenar por timestamp y tomar el más antiguo
        pendingCommands.sort((a, b) => a[1].timestamp - b[1].timestamp);
        const [oldestId, oldest] = pendingCommands[0];
        
        clearTimeout(oldest.timeout);
        this.pendingCommands.delete(oldestId);

        if (response.code >= 400) {
          oldest.reject(new Error(`Command failed: ${response.data}`));
        } else {
          oldest.resolve(response);
        }
      } else {
        // Si no hay comandos pendientes, es una respuesta no solicitada
        this.logger.warn(' Respuesta recibida sin comando pendiente:', response);
        this.emit('unsolicited', response);
      }
    }
  }

  clearPendingCommands(): void {
    for (const pending of this.pendingCommands.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingCommands.clear();
    this.responseBuffer = '';
    this.commandId = 0;
  }

  parseChannelInfo(info: string): any[] {
    return Parser.parseChannelInfo(info);
  }
}
