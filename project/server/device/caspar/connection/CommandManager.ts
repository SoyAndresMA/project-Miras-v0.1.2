import { EventEmitter } from 'events';
import { AMCPResponse, CommandQueueItem } from '../types';
import { Logger } from '../utils/Logger';
import { Parser } from '../utils/Parser';
import * as net from 'net';

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
  private socket: net.Socket | null = null; // Agregar la propiedad socket
  private commandTimeout: number = 5000; // Agregar la propiedad commandTimeout

  constructor(
    private logger: Logger,
    private timeout: number = 5000
  ) {
    super();
  }

  setSocket(socket: net.Socket | null) {
    this.socket = socket;
    this.logger.info(socket ? '✅ Socket establecido en CommandManager' : '🔄 Socket removido de CommandManager');
  }

  async sendCommand(command: string): Promise<string> {
    const commandId = `cmd_${this.commandCounter++}`;
    this.logger.info(`[CMD:${commandId}] 📤 Enviando comando: ${command}`);

    return new Promise((resolve, reject) => {
      try {
        if (!this.socket) {
          throw new Error('Socket no está disponible');
        }

        // Asegurarse de que el comando termina con \r\n
        const formattedCommand = command.trim() + '\r\n';
        
        // Intentar escribir en el socket
        const writeSuccess = this.socket.write(formattedCommand, 'utf8', (error) => {
          if (error) {
            this.logger.error(`[CMD:${commandId}] ❌ Error al escribir en el socket:`, error);
            reject(error);
            return;
          }
          this.logger.info(`[CMD:${commandId}] ✅ Comando enviado correctamente al socket`);
        });

        if (!writeSuccess) {
          throw new Error('No se pudo escribir en el socket (buffer lleno)');
        }

        // Configurar el timeout y guardar la promesa pendiente
        const timeout = setTimeout(() => this.handleCommandTimeout(commandId), this.commandTimeout);
        this.pendingCommands.set(commandId, {
          command,
          resolve,
          reject,
          timeout,
          timestamp: Date.now()
        });

      } catch (error) {
        this.logger.error(`[CMD:${commandId}] ❌ Error al enviar comando:`, error);
        reject(error);
      }
    });
  }

  handleResponse(response: string) {
    this.logger.debug(`📥 Respuesta raw recibida: "${response}"`);
    
    // Acumular la respuesta en el buffer
    this.responseBuffer += response;

    // Procesar respuestas completas (terminadas en \r\n)
    while (this.responseBuffer.includes('\r\n')) {
      const lineEndIndex = this.responseBuffer.indexOf('\r\n');
      const line = this.responseBuffer.substring(0, lineEndIndex);
      this.responseBuffer = this.responseBuffer.substring(lineEndIndex + 2);

      this.logger.info(`📥 Procesando línea: "${line}"`);

      // Si es una línea de estado (comienza con número)
      if (/^\d{3}/.test(line)) {
        const statusCode = parseInt(line.substring(0, 3));
        this.logger.info(`📊 Código de estado: ${statusCode}`);

        // Si hay comandos pendientes
        if (this.pendingCommands.size > 0) {
          const [commandId, pendingCommand] = Array.from(this.pendingCommands.entries())[0];
          
          // Acumular la respuesta completa
          let fullResponse = line;
          
          // Si es una respuesta multilinea (200 o 201)
          if (statusCode === 200 || statusCode === 201) {
            this.logger.info(`[CMD:${commandId}] 📝 Respuesta multilinea, acumulando datos...`);
            
            // Acumular líneas adicionales hasta encontrar una línea vacía
            while (this.responseBuffer.length > 0 && !this.responseBuffer.startsWith('\r\n')) {
              const nextLineEnd = this.responseBuffer.indexOf('\r\n');
              if (nextLineEnd === -1) break;
              
              const nextLine = this.responseBuffer.substring(0, nextLineEnd);
              this.responseBuffer = this.responseBuffer.substring(nextLineEnd + 2);
              
              fullResponse += '\r\n' + nextLine;
              this.logger.debug(`[CMD:${commandId}] 📝 Línea adicional: "${nextLine}"`);
            }
          }

          this.logger.info(`[CMD:${commandId}] ✅ Respuesta completa recibida: "${fullResponse}"`);
          clearTimeout(pendingCommand.timeout);
          this.pendingCommands.delete(commandId);
          pendingCommand.resolve(fullResponse);
        } else {
          this.logger.warn('⚠️ Respuesta recibida sin comandos pendientes:', line);
        }
      } else {
        this.logger.info('📄 Línea adicional recibida:', line);
      }
    }
  }

  private handleCommandTimeout(commandId: string) {
    const pendingCommand = this.pendingCommands.get(commandId);
    if (pendingCommand) {
      this.logger.error(`[CMD:${commandId}] ❌ ⏰ Timeout para comando: ${pendingCommand.command}`);
      this.pendingCommands.delete(commandId);
      pendingCommand.reject(new Error(`Command timeout after ${this.commandTimeout}ms`));
    }
  }

  clearPendingCommands() {
    for (const [commandId, command] of this.pendingCommands.entries()) {
      clearTimeout(command.timeout);
      command.reject(new Error('Connection closed'));
      this.pendingCommands.delete(commandId);
    }
  }
}
