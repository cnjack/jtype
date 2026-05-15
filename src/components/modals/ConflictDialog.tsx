import { useState } from 'react';
import { t, Trans } from '@lingui/macro';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAppDispatch, useAppState } from '../../app/AppState';
import { useCloudSync } from '../../hooks';
import { ConflictResolver, type ConflictResolution } from '@shared/components/ConflictResolver';

export function ConflictDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const sync = useCloudSync();
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
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="flex h-[85vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
              <Trans>Sync Conflicts ({state.activeConflicts.length})</Trans>
            </DialogTitle>
            <button
              type="button"
              className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              aria-label={t`Close conflicts dialog`}
              title={t`Close`}
              onClick={handleClose}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <ConflictResolver
              conflicts={state.activeConflicts}
              resolving={resolving}
              error={error}
              onResolve={handleResolve}
            />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}