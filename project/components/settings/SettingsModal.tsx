'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServersCasparCG } from "@/components/app/ServersCasparCG";
import { useOptimistic, useTransition } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [isPending, startTransition] = useTransition();
  const [optimisticSettings, setOptimisticSettings] = useOptimistic(
    { activeTab: "servers" },
    (state, newTab: string) => ({ ...state, activeTab: newTab })
  );

  const handleTabChange = (value: string) => {
    startTransition(() => {
      setOptimisticSettings(value);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl bg-gray-900 text-gray-100 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-100">Settings</DialogTitle>
        </DialogHeader>

        <Tabs 
          defaultValue={optimisticSettings.activeTab} 
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="bg-gray-800 mb-4">
            <TabsTrigger 
              value="general" 
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 text-gray-400"
              disabled={isPending}
            >
              General
            </TabsTrigger>
            <TabsTrigger 
              value="servers"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 text-gray-400"
              disabled={isPending}
            >
              Servers
            </TabsTrigger>
            <TabsTrigger 
              value="live-stream"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 text-gray-400"
              disabled={isPending}
            >
              Live Stream
            </TabsTrigger>
            <TabsTrigger 
              value="gpi"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 text-gray-400"
              disabled={isPending}
            >
              GPI
            </TabsTrigger>
            <TabsTrigger 
              value="osc"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 text-gray-400"
              disabled={isPending}
            >
              OSC
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-0">
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-medium">General Settings</h3>
              {/* Implementar configuraciones generales aquí */}
            </div>
          </TabsContent>

          <TabsContent value="servers" className="mt-0">
            <ServersCasparCG />
          </TabsContent>

          <TabsContent value="live-stream" className="mt-0">
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-medium">Live Stream Settings</h3>
              {/* Implementar configuraciones de live stream aquí */}
            </div>
          </TabsContent>

          <TabsContent value="gpi" className="mt-0">
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-medium">GPI Settings</h3>
              {/* Implementar configuraciones de GPI aquí */}
            </div>
          </TabsContent>

          <TabsContent value="osc" className="mt-0">
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-medium">OSC Settings</h3>
              {/* Implementar configuraciones de OSC aquí */}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
