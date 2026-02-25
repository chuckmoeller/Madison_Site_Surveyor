import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Clock, CloudOff, Wifi } from 'lucide-react';

interface SyncStatusProps {
  isOnline: boolean;
  pendingCount: number;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ isOnline, pendingCount }) => {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 rounded-full border border-zinc-800 backdrop-blur-sm">
      {isOnline ? (
        <Wifi className="w-4 h-4 text-emerald-500" />
      ) : (
        <CloudOff className="w-4 h-4 text-amber-500" />
      )}
      
      <div className="h-4 w-[1px] bg-zinc-800" />
      
      <div className="flex items-center gap-2">
        {pendingCount > 0 ? (
          <>
            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-xs font-mono text-amber-500">{pendingCount} PENDING</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-mono text-emerald-500">SYNCED</span>
          </>
        )}
      </div>
    </div>
  );
};
