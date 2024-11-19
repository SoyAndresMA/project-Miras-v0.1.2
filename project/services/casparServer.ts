interface ServerStatus {
  connected: boolean;
  mediaFiles: string[];
}

export const casparServerService = {
  async getServer(id: number) {
    const response = await fetch(`/api/casparcg/servers/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch server');
    }
    return response.json();
  },

  async connect(id: number) {
    const response = await fetch(`/api/casparcg/servers/${id}/connect`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to connect to server');
    }
    return response.json();
  },

  async disconnect(id: number) {
    const response = await fetch(`/api/casparcg/servers/${id}/disconnect`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to disconnect from server');
    }
    return response.json();
  },

  async updateStatus(id: number, status: ServerStatus) {
    const response = await fetch(`/api/casparcg/servers/${id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(status),
    });
    if (!response.ok) {
      throw new Error('Failed to update server status');
    }
    return response.json();
  },

  async getMediaFiles(id: number) {
    const response = await fetch(`/api/casparcg/servers/${id}/media`);
    if (!response.ok) {
      throw new Error('Failed to fetch media files');
    }
    return response.json();
  }
};
