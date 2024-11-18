import React from 'react';
import { DeviceConfig } from '@/types/device';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Save, Trash2, Power, PowerOff, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ServersCasparCGSettingsProps {
  selectedServer: DeviceConfig | null;
  isTesting: boolean;
  onSave: () => void;
  onDelete: () => void;
  onConnectServer: (server: DeviceConfig) => Promise<void>;
  onTestConnection: () => void;
  onUpdateServer: (field: string, value: any) => void;
  onCreateNew: () => void;
}

export const ServersCasparCGSettings: React.FC<ServersCasparCGSettingsProps> = ({
  selectedServer,
  isTesting,
  onSave,
  onDelete,
  onConnectServer,
  onTestConnection,
  onUpdateServer,
  onCreateNew,
}) => {
  if (!selectedServer) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Server Selected</CardTitle>
            <CardDescription>Create a new server or select an existing one to configure</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={onCreateNew}
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create New Server
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderTooltip = (content: string, children: React.ReactNode) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{selectedServer.name || 'New Server'}</h2>
          <p className="text-muted-foreground">
            {selectedServer.description || 'Configure your CasparCG server settings'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          <Badge 
            variant={selectedServer.connected ? "success" : "secondary"}
            className="h-8 px-3 flex items-center space-x-2"
          >
            {selectedServer.connected ? (
              <>
                <Power className="h-4 w-4" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <PowerOff className="h-4 w-4" />
                <span>Disconnected</span>
              </>
            )}
          </Badge>
          
          {/* Quick Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConnectServer(selectedServer)}
            disabled={isTesting || selectedServer.connected}
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Power className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onTestConnection}
            disabled={isTesting}
          >
            <RefreshCw className={`h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Main Configuration Area */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential server configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Server Name</Label>
              <Input
                id="name"
                value={selectedServer.name}
                onChange={(e) => onUpdateServer('name', e.target.value)}
                placeholder="Production Server"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="host">Host Address</Label>
              <Input
                id="host"
                value={selectedServer.host}
                onChange={(e) => onUpdateServer('host', e.target.value)}
                placeholder="localhost"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">AMCP Port</Label>
              <Input
                id="port"
                type="number"
                value={selectedServer.port}
                onChange={(e) => onUpdateServer('port', parseInt(e.target.value))}
                placeholder="5250"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={selectedServer.description || ''}
                onChange={(e) => onUpdateServer('description', e.target.value)}
                placeholder="Main production server for live broadcasts"
              />
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Settings</CardTitle>
            <CardDescription>Additional configuration options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preview_channel">Preview Channel</Label>
                <Input
                  id="preview_channel"
                  type="number"
                  value={selectedServer.preview_channel || ''}
                  onChange={(e) => onUpdateServer('preview_channel', parseInt(e.target.value))}
                  placeholder="2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locked_channel">Locked Channel</Label>
                <Input
                  id="locked_channel"
                  type="number"
                  value={selectedServer.locked_channel || ''}
                  onChange={(e) => onUpdateServer('locked_channel', parseInt(e.target.value))}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Server Status</Label>
                  <p className="text-sm text-muted-foreground">Enable or disable this server</p>
                </div>
                <Switch
                  checked={selectedServer.enabled}
                  onCheckedChange={(checked) => onUpdateServer('enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Shadow Server</Label>
                  <p className="text-sm text-muted-foreground">Use as backup/redundancy server</p>
                </div>
                <Switch
                  checked={selectedServer.is_shadow}
                  onCheckedChange={(checked) => onUpdateServer('is_shadow', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Settings */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connection Settings</CardTitle>
            <CardDescription>Configure connection behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Reconnect</Label>
                <p className="text-sm text-muted-foreground">Automatically attempt to reconnect on failure</p>
              </div>
              <Switch
                checked={selectedServer.auto_reconnect ?? true}
                onCheckedChange={(checked) => onUpdateServer('auto_reconnect', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reconnect_attempts">Max Reconnection Attempts</Label>
              <Input
                id="reconnect_attempts"
                type="number"
                value={selectedServer.max_reconnect_attempts ?? 3}
                onChange={(e) => onUpdateServer('max_reconnect_attempts', parseInt(e.target.value))}
                min={1}
                max={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reconnect_interval">Reconnection Interval (seconds)</Label>
              <Input
                id="reconnect_interval"
                type="number"
                value={selectedServer.reconnect_interval ?? 30}
                onChange={(e) => onUpdateServer('reconnect_interval', parseInt(e.target.value))}
                min={5}
                max={300}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="connection_timeout">Connection Timeout (seconds)</Label>
              <Input
                id="connection_timeout"
                type="number"
                value={selectedServer.connection_timeout ?? 10}
                onChange={(e) => onUpdateServer('connection_timeout', parseInt(e.target.value))}
                min={1}
                max={60}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server Status and Channels */}
      {selectedServer.connected && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Channel Configuration</CardTitle>
              <CardDescription>Available channels and formats</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedServer.channel_formats ? (
                <div className="space-y-2">
                  {selectedServer.channel_formats.split(',').map((channel, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                      <span className="font-medium">Channel {index + 1}</span>
                      <Badge variant="secondary">{channel}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No channels configured</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Server Status</CardTitle>
              <CardDescription>Current server information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedServer.version && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Version</span>
                  <Badge variant="outline">{selectedServer.version}</Badge>
                </div>
              )}

              {selectedServer.last_connection && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Connected</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedServer.last_connection).toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connection History */}
      {selectedServer.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Connection History</CardTitle>
            <CardDescription>Recent connection events</CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectionHistory serverId={selectedServer.id} />
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-6">
        <Button
          variant="outline"
          onClick={onCreateNew}
          disabled={isTesting}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Server
        </Button>

        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={isTesting || selectedServer.id === 0}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>

        <Button
          onClick={onSave}
          disabled={isTesting}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
};
