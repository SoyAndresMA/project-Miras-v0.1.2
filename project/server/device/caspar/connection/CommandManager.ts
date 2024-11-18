import { EventEmitter } from 'events';
import { AMCPResponse, CommandQueueItem } from '../types';
import { Logger } from '../utils/Logger';
import { Parser } from '../utils/Parser';

export class CommandManager extends EventEmitter {
  private pendingCommands: Map<string, CommandQueueItem> = new Map();
  private responseBuffer: string = '';
  private commandTimeout: number;

  constructor(
    private logger: Logger,
    commandTimeout: number = 5000
  ) {
    super();
    this.commandTimeout = commandTimeout;
  }

  async sendCommand(command: string): Promise<AMCPResponse> {
    this.logger.debug(`📤 Enviando comando: ${command}`);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingCommands.delete(command);
        reject(new Error(`Command timeout: ${command}`));
      }, this.commandTimeout);

      this.pendingCommands.set(command, {
        resolve,
        reject,
        command,
        timeout: timeoutId
      });

      this.emit('command', command + '\r\n');
    });
  }

  handleData(data: Buffer): void {
    this.responseBuffer += data.toString();

    let response: AMCPResponse | null;
    while ((response = Parser.parseResponse(this.responseBuffer)) !== null) {
      this.handleResponse(response);
      this.responseBuffer = this.responseBuffer.substring(response.data.length);
    }
  }

  private handleResponse(response: AMCPResponse): void {
    this.logger.debug(`📥 Respuesta recibida: ${JSON.stringify(response)}`);

    // Buscar el comando pendiente correspondiente
    for (const [command, pending] of this.pendingCommands.entries()) {
      if (this.matchesCommand(command, response)) {
        clearTimeout(pending.timeout);
        this.pendingCommands.delete(command);

        if (response.code >= 400) {
          pending.reject(new Error(`Command failed: ${response.data}`));
        } else {
          pending.resolve(response);
        }
        return;
      }
    }

    // Si llegamos aquí, es una respuesta sin comando pendiente
    this.logger.warn('⚠️ Respuesta recibida sin comando pendiente:', response);
    this.emit('unsolicited', response);
  }

  private matchesCommand(command: string, response: AMCPResponse): boolean {
    // Implementar lógica de matching según el protocolo AMCP
    return true; // Simplificado para el ejemplo
  }

  clearPendingCommands(): void {
    for (const pending of this.pendingCommands.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingCommands.clear();
  }
}
