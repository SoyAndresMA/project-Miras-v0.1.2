import { useState, useEffect } from 'react';
import { ServerState } from '@/server/device/caspar/types';

export function useServerState(serverId: number) {
  const [state, setState] = useState<ServerState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource;

    const connectSSE = () => {
      // Primero obtener el estado inicial
      fetch(`/api/casparcg/servers/${serverId}/state`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(initialState => {
          setState(initialState);
          
          // Luego conectar al SSE para actualizaciones
          eventSource = new EventSource(`/api/casparcg/servers/${serverId}/events`);
          
          eventSource.onmessage = (event) => {
            const newState = JSON.parse(event.data);
            setState(newState);
          };

          eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            setError('Error en la conexión con el servidor');
            eventSource.close();
            // Reintentar conexión después de 5 segundos
            setTimeout(connectSSE, 5000);
          };
        })
        .catch(err => {
          console.error('Error fetching initial state:', err);
          setError('Error al obtener el estado inicial del servidor');
        });
    };

    connectSSE();

    // Limpiar al desmontar
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [serverId]);

  return { state, error };
}
