"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServersCasparCG } from "./ServersCasparCG";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl bg-gray-900 text-gray-100 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-100">Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="servers" className="w-full">
          <TabsList className="bg-gray-800 mb-4">
            <TabsTrigger 
              value="general" 
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 text-gray-400"
            >
              General
            </TabsTrigger>
            <TabsTrigger 
              value="servers"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 text-gray-400"
            >
              Servers
            </TabsTrigger>
            <TabsTrigger 
              value="live-stream"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 text-gray-400"
            >
              Live Stream
            </TabsTrigger>
            <TabsTrigger 
              value="gpi"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 text-gray-400"
            >
              GPI
            </TabsTrigger>
            <TabsTrigger 
              value="osc"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-gray-100 text-gray-400"
            >
              OSC
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-0">
            General settings coming soon...
          </TabsContent>

          <TabsContent value="servers" className="mt-0">
            <ServersCasparCG />
          </TabsContent>

          <TabsContent value="live-stream" className="mt-0">
            Live stream settings coming soon...
          </TabsContent>

          <TabsContent value="gpi" className="mt-0">
            GPI settings coming soon...
          </TabsContent>

          <TabsContent value="osc" className="mt-0">
            OSC settings coming soon...
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}