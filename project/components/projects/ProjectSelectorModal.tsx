"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Project } from "@/lib/types/project";
import { cn } from "@/lib/utils";

interface ProjectSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: Project) => void;
}

export default function ProjectSelectorModal({
  isOpen,
  onClose,
  onSelectProject,
}: ProjectSelectorModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to load projects");
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Error loading projects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProjectId(project.id);
    onSelectProject(project);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px] bg-gray-800 text-gray-100 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Select Project</DialogTitle>
        </DialogHeader>

        <div className="relative min-h-[300px] border border-gray-700 rounded-md">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center text-red-400">
              {error}
            </div>
          ) : projects.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              No projects found
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-gray-700/50 transition-colors",
                    "flex items-center justify-between",
                    selectedProjectId === project.id && "bg-gray-700"
                  )}
                >
                  <div>
                    <h3 className="font-medium">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}