import { Suspense } from "react";
import { Project } from "@/lib/types/project";
import { MEvent } from "@/lib/types/event";
import MEventComponent from "@/components/events/MEvent";
import { useServerState } from "@/components/providers/ServerStateProvider";
import { updateProject } from "./actions/project-actions";
import { useOptimistic } from "react";

export default function Home() {
  const { currentProject } = useServerState();
  const [optimisticProject, updateOptimisticProject] = useOptimistic(
    currentProject,
    (state: Project | null, newProject: Project) => newProject
  );

  const handleProjectUpdate = async (updatedProject: Project) => {
    // Actualizar optimisticamente
    updateOptimisticProject(updatedProject);
    
    try {
      // Actualizar en el servidor
      await updateProject(updatedProject);
    } catch (error) {
      console.error('Error updating project:', error);
      // Aquí podrías mostrar un toast de error
    }
  };

  if (!optimisticProject) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">No hay proyecto seleccionado</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col p-4">
      <h1 className="text-2xl font-bold mb-4">{optimisticProject.name}</h1>
      
      <Suspense fallback={<div>Cargando eventos...</div>}>
        <div className="space-y-4">
          {optimisticProject.events?.map((event: MEvent) => (
            <MEventComponent 
              key={event.id} 
              event={event}
              onUpdate={(updatedEvent) => {
                const updatedProject = {
                  ...optimisticProject,
                  events: optimisticProject.events.map(e => 
                    e.id === updatedEvent.id ? updatedEvent : e
                  )
                };
                handleProjectUpdate(updatedProject);
              }}
            />
          ))}
        </div>
      </Suspense>
    </main>
  );
}