"use client";

export function RightPanel() {
  return (
    <div className="w-[426px] bg-gray-800 shadow-lg flex flex-col border-l border-gray-700">
      <div className="flex-1 p-1 border-b border-gray-700">
        Upper Panel
      </div>
      <div className="flex-1 p-1">
        Lower Panel
      </div>
    </div>
  );
}