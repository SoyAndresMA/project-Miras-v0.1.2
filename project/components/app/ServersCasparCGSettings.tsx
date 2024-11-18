import React from 'react';
import { DeviceConfig } from '@/types/device';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ServersCasparCGSettingsProps {
  selectedServer: DeviceConfig | null;
  isTesting: boolean;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onConnectServer: (server: DeviceConfig) => Promise<void>;
  onTestConnection: () => Promise<void>;
  onUpdateServer: (field: keyof DeviceConfig, value: string | number) => void;
}

export const ServersCasparCGSettings: React.FC<ServersCasparCGSettingsProps> = ({
  selectedServer,
  isTesting,
  onSave,
  onDelete,
  onConnectServer,
  onTestConnection,
  onUpdateServer,
}) => {
  if (!selectedServer) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a server to configure</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={selectedServer.name}
            onChange={(e) => onUpdateServer('name', e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="host">Host</Label>
          <Input
            id="host"
            value={selectedServer.host}
            onChange={(e) => onUpdateServer('host', e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            type="number"
            value={selectedServer.port}
            onChange={(e) => onUpdateServer('port', parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => onConnectServer(selectedServer)}
            disabled={isTesting}
            className="text-black dark:text-white"
          >
            {isTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Loader2 className="mr-2 h-4 w-4" />
            )}
            Connect
          </Button>

          <Button
            variant="outline"
            onClick={onTestConnection}
            disabled={isTesting}
            className="text-black dark:text-white"
          >
            Test Connection
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <Button onClick={onSave} disabled={isTesting}>
            Save
          </Button>
          {selectedServer.id !== 0 && (
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isTesting}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
