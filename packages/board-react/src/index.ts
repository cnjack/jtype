import './styles.css'

export { JTypeBoard } from './JTypeBoard'
export type { JTypeBoardProps, JTypeBoardConnection } from './JTypeBoard'
export { createJTypeClient, JTypeApiError } from './client'
export type {
  CreateClientOptions,
  JTypeBoardDataClient,
  JTypeCloudDocument,
  JTypeDocumentListItem,
  JTypeSaveDocumentRequest,
  JTypeSaveDocumentResponse,
  LiveSubscriptionHandlers,
} from './client'
export { JTypeBoardError, resolveBoardDoc } from './resolveBoard'
export type { BoardResolution } from './resolveBoard'
export type { BoardConfigJSON } from './boardData'
export type { BoardLocale } from './i18n'
// The normalized card model, for onCardOpen handlers.
export type { BoardPersonalViewState, BoardViewCard, BoardTag } from '@shared/lib/board'
