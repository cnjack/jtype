// The package's OWN chrome strings (connection chip, read-only detail panel,
// error states). The shared board surface localizes through the shared lingui
// catalogs; these few embed-only strings live in a plain dict instead of a
// lingui catalog because package src is outside the repo's extraction set —
// a stray macro here would silently render message ids.
import type { BoardLocale } from './i18n'

export type UiStrings = {
  loading: string
  live: string
  polling: (secs: number) => string
  connectionError: string
  liveUnavailableHint: string
  retry: string
  close: string
  cardReadOnlyHint: string
  additionalInformation: string
  status: string
  swimlane: string
  unassigned: string
  priority: string
  assignee: string
  start: string
  due: string
  reminder: string
  archived: string
  tags: string
  attachments: string
  notes: string
  unsafeLink: string
  confirmDeleteCard: (title: string) => string
  deleteUnsupported: string
  errPropsBoth: string
  errPropsNone: string
  errBoardNotFound: (ref: string) => string
  errBoardAmbiguous: (ref: string, candidates: string[]) => string
  errBoardConfigInvalid: string
  errCardNotFound: (path: string) => string
  errUnauthorized: string
  errNetwork: string
  errGeneric: (detail: string) => string
}

const en: UiStrings = {
  loading: 'Loading board…',
  live: 'Live',
  polling: (secs) => `Auto-refresh · ${secs}s`,
  connectionError: 'Connection error',
  liveUnavailableHint: 'Live updates are not available for this token — refreshing by polling.',
  retry: 'Retry',
  close: 'Close',
  cardReadOnlyHint: 'Read-only card view',
  additionalInformation: 'Additional information',
  status: 'Status',
  swimlane: 'Swimlane',
  unassigned: 'Unassigned',
  priority: 'Priority',
  assignee: 'Assignee',
  start: 'Start',
  due: 'Due',
  reminder: 'Reminder',
  archived: 'Archived',
  tags: 'Tags',
  attachments: 'Attachments',
  notes: 'Notes',
  unsafeLink: 'unsafe link blocked',
  confirmDeleteCard: (title) => `Delete card "${title}"? It moves to the trash.`,
  deleteUnsupported: 'This client does not support deleting cards.',
  errPropsBoth: 'Pass either `client` OR `baseUrl`+`token` to <JTypeBoard>, not both.',
  errPropsNone: '<JTypeBoard> needs `baseUrl`+`token`, or an injected `client`.',
  errBoardNotFound: (ref) => `Board "${ref}" was not found in this workspace.`,
  errBoardAmbiguous: (ref, cands) => `Board name "${ref}" is ambiguous: ${cands.join(', ')}. Use the full path.`,
  errBoardConfigInvalid: 'The board configuration document could not be parsed.',
  errCardNotFound: (path) => `Card "${path}" was not found on this board.`,
  errUnauthorized: 'The token was rejected (invalid, expired, or no access to this workspace).',
  errNetwork: 'Could not reach the jtype server.',
  errGeneric: (detail) => `Board failed to load: ${detail}`,
}

const zh: UiStrings = {
  loading: '正在加载看板…',
  live: '实时',
  polling: (secs) => `自动刷新 · ${secs}秒`,
  connectionError: '连接错误',
  liveUnavailableHint: '当前令牌不支持实时更新，已改为轮询刷新。',
  retry: '重试',
  close: '关闭',
  cardReadOnlyHint: '只读卡片视图',
  additionalInformation: '附加信息',
  status: '状态',
  swimlane: '泳道',
  unassigned: '未分配',
  priority: '优先级',
  assignee: '负责人',
  start: '开始',
  due: '截止',
  reminder: '提醒',
  archived: '已归档',
  tags: '标签',
  attachments: '附件',
  notes: '备注',
  unsafeLink: '已拦截不安全链接',
  confirmDeleteCard: (title) => `删除卡片“${title}”？它将移入回收站。`,
  deleteUnsupported: '当前客户端不支持删除卡片。',
  errPropsBoth: '<JTypeBoard> 的 `client` 与 `baseUrl`+`token` 只能二选一。',
  errPropsNone: '<JTypeBoard> 需要 `baseUrl`+`token`，或注入 `client`。',
  errBoardNotFound: (ref) => `在该工作区中找不到看板“${ref}”。`,
  errBoardAmbiguous: (ref, cands) => `看板名“${ref}”有歧义：${cands.join('、')}。请使用完整路径。`,
  errBoardConfigInvalid: '看板配置文档无法解析。',
  errCardNotFound: (path) => `在该看板中找不到卡片“${path}”。`,
  errUnauthorized: '令牌被拒绝（无效、过期或无该工作区权限）。',
  errNetwork: '无法连接 jtype 服务器。',
  errGeneric: (detail) => `看板加载失败：${detail}`,
}

const ja: UiStrings = {
  loading: 'ボードを読み込み中…',
  live: 'ライブ',
  polling: (secs) => `自動更新 · ${secs}秒`,
  connectionError: '接続エラー',
  liveUnavailableHint: 'このトークンではライブ更新を利用できないため、ポーリングで更新します。',
  retry: '再試行',
  close: '閉じる',
  cardReadOnlyHint: '読み取り専用のカード表示',
  additionalInformation: '追加情報',
  status: 'ステータス',
  swimlane: 'スイムレーン',
  unassigned: '未割り当て',
  priority: '優先度',
  assignee: '担当者',
  start: '開始',
  due: '期限',
  reminder: 'リマインダー',
  archived: 'アーカイブ済み',
  tags: 'タグ',
  attachments: '添付ファイル',
  notes: 'メモ',
  unsafeLink: '安全でないリンクをブロックしました',
  confirmDeleteCard: (title) => `カード「${title}」を削除しますか？ごみ箱に移動します。`,
  deleteUnsupported: 'このクライアントはカードの削除に対応していません。',
  errPropsBoth: '<JTypeBoard> には `client` か `baseUrl`+`token` のどちらか一方のみを渡してください。',
  errPropsNone: '<JTypeBoard> には `baseUrl`+`token` または `client` が必要です。',
  errBoardNotFound: (ref) => `ワークスペースにボード「${ref}」が見つかりません。`,
  errBoardAmbiguous: (ref, cands) => `ボード名「${ref}」が曖昧です：${cands.join('、')}。フルパスを使用してください。`,
  errBoardConfigInvalid: 'ボード設定ドキュメントを解析できませんでした。',
  errCardNotFound: (path) => `このボードにカード「${path}」が見つかりません。`,
  errUnauthorized: 'トークンが拒否されました（無効・期限切れ・権限なし）。',
  errNetwork: 'jtype サーバーに接続できません。',
  errGeneric: (detail) => `ボードの読み込みに失敗しました：${detail}`,
}

const ko: UiStrings = {
  loading: '보드를 불러오는 중…',
  live: '실시간',
  polling: (secs) => `자동 새로고침 · ${secs}초`,
  connectionError: '연결 오류',
  liveUnavailableHint: '이 토큰은 실시간 업데이트를 지원하지 않아 폴링으로 새로고침합니다.',
  retry: '다시 시도',
  close: '닫기',
  cardReadOnlyHint: '읽기 전용 카드 보기',
  additionalInformation: '추가 정보',
  status: '상태',
  swimlane: '스윔레인',
  unassigned: '미할당',
  priority: '우선순위',
  assignee: '담당자',
  start: '시작',
  due: '마감',
  reminder: '알림',
  archived: '보관됨',
  tags: '태그',
  attachments: '첨부파일',
  notes: '메모',
  unsafeLink: '안전하지 않은 링크 차단됨',
  confirmDeleteCard: (title) => `카드 "${title}"을(를) 삭제할까요? 휴지통으로 이동합니다.`,
  deleteUnsupported: '이 클라이언트는 카드 삭제를 지원하지 않습니다.',
  errPropsBoth: '<JTypeBoard>에는 `client` 또는 `baseUrl`+`token` 중 하나만 전달하세요.',
  errPropsNone: '<JTypeBoard>에는 `baseUrl`+`token` 또는 `client`가 필요합니다.',
  errBoardNotFound: (ref) => `워크스페이스에서 보드 "${ref}"을(를) 찾을 수 없습니다.`,
  errBoardAmbiguous: (ref, cands) => `보드 이름 "${ref}"이(가) 모호합니다: ${cands.join(', ')}. 전체 경로를 사용하세요.`,
  errBoardConfigInvalid: '보드 설정 문서를 해석할 수 없습니다.',
  errCardNotFound: (path) => `이 보드에서 카드 "${path}"을(를) 찾을 수 없습니다.`,
  errUnauthorized: '토큰이 거부되었습니다(무효, 만료 또는 권한 없음).',
  errNetwork: 'jtype 서버에 연결할 수 없습니다.',
  errGeneric: (detail) => `보드를 불러오지 못했습니다: ${detail}`,
}

const dicts: Record<BoardLocale, UiStrings> = { en, zh, ja, ko }

export function uiStrings(locale: BoardLocale): UiStrings {
  return dicts[locale] ?? dicts.en
}
