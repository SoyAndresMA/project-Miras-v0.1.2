import { AMCPResponse } from '../types';

export class Parser {
  static parseResponse(data: string): AMCPResponse | null {
    // Ignorar líneas vacías
    if (!data.trim()) {
      return null;
    }

    // El formato de respuesta AMCP es: [código] [datos]
    const match = data.match(/^(\d{3})(?: (.+))?$/);
    if (!match) {
      return null;
    }

    const code = parseInt(match[1], 10);
    const responseData = match[2] || '';

    return {
      code,
      data: responseData
    };
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
          currentChannel.frameRate = parseInt(formatMatch[3] || '0', 10);
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
