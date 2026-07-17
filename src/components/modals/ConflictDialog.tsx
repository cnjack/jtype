import { useState } from 'react';
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAppDispatch, useAppState } from '../../app/AppState';
import { useCloudSync } from '../../hooks';
import { ConflictResolver, type ConflictResolution } from '@shared/components/ConflictResolver';
import { useRuntimeCapabilities } from '../../app/RuntimeCapabilities';

export function ConflictDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const sync = useCloudSync();
  const capabilities = useRuntimeCapabilities();
  const compact = capabilities.prefersCompactLayout;
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    dispatch({ type: 'SET_CONFLICT_DIALOG', open: false });
  };

  const handleResolve = async (conflictId: string, resolution: ConflictResolution, mergedContent?: string) => {
    setResolving(true);
    setError('');
    try {
      await sync.resolveConflict(conflictId, resolution, mergedContent);
      if (state.activeConflicts.length <= 1) {
        handleClose();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setResolving(false);
    }
  };

  return (
    <Dialog open={state.conflictDialogOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className={`fixed inset-0 flex ${compact ? "items-end" : "items-center justify-center p-4"}`}>
        <DialogPanel
          id="conflict-dialog"
          data-compact={compact ? "true" : "false"}
          className={`flex w-full flex-col bg-white shadow-2xl ${compact ? "h-[100dvh] max-h-[100dvh]" : "h-[85vh] max-w-6xl rounded-xl"}`}
        >
          <div
            className={`flex shrink-0 items-center justify-between border-b border-stone-200 ${compact ? "min-h-14 px-4 pb-3" : "px-5 py-3"}`}
            style={compact ? { paddingTop: "max(0.75rem, env(safe-area-inset-top))" } : undefined}
          >
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
              <Trans>Sync Conflicts ({state.activeConflicts.length})</Trans>
            </DialogTitle>
            <button
              type="button"
              className={`rounded text-stone-400 hover:bg-stone-100 hover:text-stone-600 ${capabilities.isTouchPrimary ? "flex min-h-11 min-w-11 items-center justify-center" : "p-1"}`}
              aria-label={t`Close conflicts dialog`}
              title={t`Close`}
              onClick={handleClose}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <div className={`${compact ? "min-h-0 overflow-hidden p-3" : "overflow-y-auto p-5"} flex-1`}>
            <ConflictResolver
              conflicts={state.activeConflicts}
              resolving={resolving}
              error={error}
              compact={compact}
              touchOptimized={capabilities.isTouchPrimary}
              onResolve={handleResolve}
            />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
