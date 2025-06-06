'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SyncStats {
  totalFound: number;
  imported: number;
  skipped: number;
  errors: number;
}

interface SyncResponse {
  success: boolean;
  message: string;
  stats: SyncStats | null;
  hasNewReports: boolean;
  timestamp: string;
}

interface GmailSyncButtonProps {
  onSyncComplete?: (result: SyncResponse) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function GmailSyncButton({ 
  onSyncComplete, 
  className,
  variant = 'outline',
  size = 'default'
}: GmailSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResponse | null>(null);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      const response = await fetch('/api/sync-gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: SyncResponse = await response.json();
      setLastSyncResult(result);

      if (result.success) {
        // Show success toast with stats
        const { stats } = result;
        if (stats && stats.imported > 0) {
          toast({
            title: 'Sync completed!',
            description: result.message,
            duration: 5000,
          });
        } else {
          toast({
            title: 'Already up to date',
            description: result.message,
            duration: 3000,
          });
        }
      } else {
        // Show error toast
        toast({
          title: 'Sync failed',
          description: result.message,
          variant: 'destructive',
          duration: 5000,
        });
      }

      // Call the callback if provided
      if (onSyncComplete) {
        onSyncComplete(result);
      }
    } catch (error) {
      const errorResult: SyncResponse = {
        success: false,
        message: 'Network error. Please check your connection.',
        stats: null,
        hasNewReports: false,
        timestamp: new Date().toISOString(),
      };
      setLastSyncResult(errorResult);
      
      toast({
        title: 'Connection error',
        description: 'Unable to connect to the server. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });

      if (onSyncComplete) {
        onSyncComplete(errorResult);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Determine icon based on state
  const getIcon = () => {
    if (isSyncing) {
      return <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />;
    }
    if (lastSyncResult) {
      if (lastSyncResult.success && lastSyncResult.stats?.errors === 0) {
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      } else if (!lastSyncResult.success) {
        return <XCircle className="h-4 w-4 text-red-500" />;
      } else {
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      }
    }
    return <RefreshCw className="h-4 w-4" />;
  };

  // Determine button text
  const getButtonText = () => {
    if (isSyncing) return 'Syncing...';
    if (lastSyncResult?.success && lastSyncResult.hasNewReports) {
      return `Synced ${lastSyncResult.stats?.imported} new`;
    }
    return 'Sync Gmail Now';
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleSync}
        disabled={isSyncing}
        variant={variant}
        size={size}
        className={cn(
          "transition-all duration-200",
          lastSyncResult?.success && "border-green-500",
          !lastSyncResult?.success && lastSyncResult && "border-red-500",
          className
        )}
      >
        {getIcon()}
        {size !== 'icon' && (
          <span className="ml-2">{getButtonText()}</span>
        )}
      </Button>
      
      {/* Optional: Show last sync time */}
      {lastSyncResult && !isSyncing && (
        <span className="text-xs text-muted-foreground">
          Last sync: {new Date(lastSyncResult.timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

// Export a simpler version for icon-only usage
export function GmailSyncIconButton({ onSyncComplete, className }: Omit<GmailSyncButtonProps, 'size' | 'variant'>) {
  return (
    <GmailSyncButton 
      onSyncComplete={onSyncComplete} 
      className={className}
      size="icon"
      variant="ghost"
    />
  );
}