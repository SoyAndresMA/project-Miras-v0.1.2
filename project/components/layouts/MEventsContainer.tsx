"use client";

interface MEventsContainerProps {
  children: React.ReactNode;
}

export function MEventsContainer({ children }: MEventsContainerProps) {
  return (
    <div className="flex-grow overflow-y-auto p-3" style={{ minWidth: 0 }}>
      <div className="space-y-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:w-1/4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-500/50 [&::-webkit-scrollbar-track]:bg-gray-800/30">
        {children}
      </div>
    </div>
  );
}