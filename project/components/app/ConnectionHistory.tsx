import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConnectionEvent {
  id: number;
  timestamp: string;
  success: boolean;
  message: string;
}

interface ConnectionHistoryProps {
  serverId: number;
}

export const ConnectionHistory: React.FC<ConnectionHistoryProps> = ({ serverId }) => {
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/casparcg/servers/${serverId}/logs`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        }
      } catch (error) {
        console.error('Failed to fetch connection history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    // Refresh history every minute
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [serverId]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No connection events recorded
      </div>
    );
  }

  return (
    <ScrollArea className="h-[200px]">
      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center space-x-2 p-2 rounded-lg bg-secondary/20"
          >
            {event.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{event.message}</p>
            </div>
            <Badge variant="secondary" className="flex-shrink-0">
              {new Date(event.timestamp).toLocaleTimeString()}
            </Badge>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
