import { AMCPResponse } from '../types';

export class Parser {
  static parseResponse(data: string): AMCPResponse | null {
    // Ignorar líneas vacías
    if (!data.trim()) {
      return null;
    }

    // Intentar parsear como JSON primero
    try {
      const jsonResponse = JSON.parse(data);
      return {
        code: jsonResponse.code,
        status: jsonResponse.code >= 400 ? 'ERROR' : 'OK',
        data: jsonResponse.data || ''
      };
    } catch {
      // Si no es JSON, intentar parsear como AMCP
      const amcpMatch = data.match(/^(\d{3})\s+([\w\s]+?)(?:\s+OK|\s+ERROR)(?:\s+(.+))?$/i);
      if (amcpMatch) {
        const [, code, command, responseData] = amcpMatch;
        return {
          code: parseInt(code),
          status: data.includes('ERROR') ? 'ERROR' : 'OK',
          data: responseData || ''
        };
      }

      // Si no coincide con ningún formato, devolver error
      return null;
    }
  }

  static isCompleteResponse(data: string): boolean {
    return data.endsWith('\r\n');
  }

  static parseChannelInfo(info: string): any[] {
    const channels: any[] = [];
    const lines = info.split('\n');
    
    let currentChannel: any = null;
    
    for (const line of lines) {
      const channelMatch = line.match(/^\d+-\d+/);
      if (channelMatch) {
        if (currentChannel) {
          channels.push(currentChannel);
        }
        currentChannel = {
          id: channels.length + 1,
          number: parseInt(channelMatch[0].split('-')[0], 10),
          resolution: '',
          frameRate: 0,
          layers: []
        };
      } else if (currentChannel && line.includes('format')) {
        const formatMatch = line.match(/format\s+(\d+)x(\d+)(?:-(\d+))?/);
        if (formatMatch) {
          currentChannel.resolution = `${formatMatch[1]}x${formatMatch[2]}`;
          if (formatMatch[3]) {
            currentChannel.frameRate = parseInt(formatMatch[3], 10);
          }
        }
      }
    }
    
    if (currentChannel) {
      channels.push(currentChannel);
    }
    
    return channels;
  }

  static parseLayerInfo(data: string): any {
    // Implementar parser específico para información de capas
    // Este es un placeholder - la implementación real dependerá del formato exacto
    return {};
  }
}
