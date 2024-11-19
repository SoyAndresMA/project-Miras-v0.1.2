import React from 'react';
import { DeviceConfig } from '@/lib/types/device';
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
import { useServerState } from '@/hooks/useServerState';

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
  const { state, error } = useServerState(selectedServer?.id || 0);
  const isConnected = state?.connected ?? false;
  const lastActivity = state?.lastActivity ? new Date(state.lastActivity).toLocaleString() : 'N/A';

  if (!selectedServer) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">No Server Selected</CardTitle>
            <CardDescription className="text-white">
              Create a new server or select an existing one to configure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full bg-gray-700 hover:bg-gray-600 text-white" 
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
    <div className="space-y-8 p-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {selectedServer.name || 'New Server'}
          </h2>
          <p className="text-gray-100">
            {selectedServer.description || 'Configure your CasparCG server settings'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          <Badge 
            variant={isConnected ? "success" : "secondary"}
            className="h-8 px-3 flex items-center space-x-2 bg-opacity-20"
          >
            {isConnected ? (
              <>
                <Power className="h-4 w-4 text-green-500" />
                <span className="text-green-400">Connected</span>
              </>
            ) : (
              <>
                <PowerOff className="h-4 w-4 text-gray-100" />
                <span className="text-gray-100">Disconnected</span>
              </>
            )}
          </Badge>
          
          {error && (
            <Badge variant="destructive" className="h-8 px-3">
              {error}
            </Badge>
          )}

          {/* Last Activity */}
          <Badge variant="outline" className="h-8 px-3">
            Last Activity: {lastActivity}
          </Badge>
          
          {/* Quick Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConnectServer(selectedServer)}
            disabled={isTesting || isConnected}
            className="border-gray-700 hover:bg-gray-800 text-white"
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
            className="border-gray-700 hover:bg-gray-800 text-white"
          >
            <RefreshCw className={`h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Separator className="bg-gray-700" />

      {/* Main Configuration Area */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Basic Info */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Basic Information</CardTitle>
            <CardDescription className="text-gray-100">
              Essential server configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Server Name</Label>
              <Input
                id="name"
                value={selectedServer.name}
                onChange={(e) => onUpdateServer('name', e.target.value)}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                placeholder="Production Server"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="host" className="text-white">Host Address</Label>
              <Input
                id="host"
                value={selectedServer.host}
                onChange={(e) => onUpdateServer('host', e.target.value)}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                placeholder="localhost"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="port" className="text-white">AMCP Port</Label>
              <Input
                id="port"
                type="number"
                value={selectedServer.port}
                onChange={(e) => onUpdateServer('port', parseInt(e.target.value))}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                placeholder="5250"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Description</Label>
              <Input
                id="description"
                value={selectedServer.description || ''}
                onChange={(e) => onUpdateServer('description', e.target.value)}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
                placeholder="Main production server for live broadcasts"
              />
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Advanced Settings</CardTitle>
            <CardDescription className="text-gray-100">
              Additional configuration options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Server Status</Label>
                  <div className="text-sm text-gray-100">
                    Enable or disable this server
                  </div>
                </div>
                <Switch
                  checked={selectedServer.enabled}
                  onCheckedChange={(checked) => onUpdateServer('enabled', checked)}
                  className="text-white"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white">Shadow Server</Label>
                  <div className="text-sm text-gray-100">
                    Mark this as a shadow server
                  </div>
                </div>
                <Switch
                  checked={selectedServer.is_shadow}
                  onCheckedChange={(checked) => onUpdateServer('is_shadow', checked)}
                  className="text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Server Information</Label>
              <div className="space-y-2">
                <div className="p-3 bg-gray-900 rounded-md">
                  <div className="text-sm font-medium text-white">Version</div>
                  <div className="text-white">
                    {selectedServer.version || 'Not connected'}
                  </div>
                </div>
                <div className="p-3 bg-gray-900 rounded-md">
                  <div className="text-sm font-medium text-white">Channels</div>
                  <div className="text-white">
                    {selectedServer.channel_formats ? (
                      selectedServer.channel_formats.split(',').map((format, i) => (
                        <div key={i} className="text-white">Channel {i + 1}: {format}</div>
                      ))
                    ) : (
                      'Not connected'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-700">
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={!selectedServer.id}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Server
        </Button>

        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={onTestConnection}
            disabled={isTesting}
            className="border-gray-700 hover:bg-gray-800 text-white"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />
            Test Connection
          </Button>

          <Button
            onClick={onSave}
            disabled={isTesting}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};
