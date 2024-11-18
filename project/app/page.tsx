"use client";

import { useEffect, useState } from "react";
import { Project } from "@/lib/types/project";
import { MEvent } from "@/lib/types/event";
import MEventComponent from "@/components/events/MEvent";

export default function Home() {
  const [project, setProject] = useState<Project | null>(null);
  const [events, setEvents] = useState<MEvent[]>([]);

  // Listen for project changes
  useEffect(() => {
    const handleProjectChange = async (e: CustomEvent) => {
      const projectData = e.detail;
      setProject(projectData);
      setEvents(projectData.events || []);
    };

    window.addEventListener('projectLoaded', handleProjectChange as EventListener);
    return () => {
      window.removeEventListener('projectLoaded', handleProjectChange as EventListener);
    };
  }, []);

  const handleEventChange = (eventId: number, changes: Partial<MEvent>) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId ? { ...event, ...changes } : event
      )
    );
  };

  if (!project) {
    return (
      <div className="text-center text-gray-500">
        <h2 className="text-2xl font-bold mb-2">Select a project to begin</h2>
        <p>Use the menu to open a project</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <MEventComponent
          key={event.id}
          event={event}
          onEventChange={handleEventChange}
          availableUnions={[]}
        />
      ))}
    </div>
  );
}