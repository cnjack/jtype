import { useState } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { JTypeBoard, type JTypeBoardConnection, type BoardLocale } from 'jtype-board-react'

// Manual-verification host. Connection settings come from Vite env
// (VITE_JTYPE_BASE_URL / _TOKEN / _WORKSPACE_ID / _BOARD_REF — e.g. via
// example/.env.local) with a localStorage-backed form as fallback, so the
// acceptance flow "bare React app on a non-jtype origin + 4 props" is a
// paste-and-reload. NOTE: keeping a raw token in the HOST page's localStorage
// is the trusted-host trade-off the package README warns about — fine for this
// dev rig, not a pattern for production embeds.

type Cfg = {
  baseUrl: string
  token: string
  workspaceId: string
  boardRef: string
  readOnly: boolean
  locale: BoardLocale
}

const LS_KEY = 'jtype-board-react-example.cfg'

function initialCfg(): Cfg {
  const env = import.meta.env
  let stored: Partial<Cfg> = {}
  try {
    stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Partial<Cfg>
  } catch {
    /* ignore */
  }
  return {
    baseUrl: (env.VITE_JTYPE_BASE_URL as string) || stored.baseUrl || '',
    token: (env.VITE_JTYPE_TOKEN as string) || stored.token || '',
    workspaceId: (env.VITE_JTYPE_WORKSPACE_ID as string) || stored.workspaceId || '',
    boardRef: (env.VITE_JTYPE_BOARD_REF as string) || stored.boardRef || '',
    readOnly: stored.readOnly ?? false,
    locale: stored.locale ?? 'en',
  }
}

export function App() {
  const [cfg, setCfg] = useState<Cfg>(initialCfg)
  const [applied, setApplied] = useState<Cfg | null>(() => {
    const c = initialCfg()
    return c.baseUrl && c.token && c.workspaceId && c.boardRef ? c : null
  })
  const [conn, setConn] = useState<JTypeBoardConnection | null>(null)
  const [secondBoard, setSecondBoard] = useState('')

  const apply = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg))
    setApplied({ ...cfg })
  }

  const field = (label: string, key: keyof Cfg, type = 'text') => (
    <label style={{ display: 'block', margin: '6px 0' }}>
      <span style={{ display: 'inline-block', width: 110, fontSize: 13 }}>{label}</span>
      <input
        type={type}
        value={String(cfg[key])}
        onChange={(e) => setCfg({ ...cfg, [key]: e.target.value })}
        style={{ width: 380, fontFamily: 'monospace', fontSize: 12 }}
      />
    </label>
  )

  return (
    <div style={{ padding: 16 }}>
      {/* Leakage probe: a HOST-owned Headless UI dropdown, deliberately
          unstyled (browser defaults). Its portal carries the same
          [data-headlessui-portal] attribute as the board's menus — with the
          package css loaded, the <p> must keep its default margin, the
          <button> its native background/border, and no --color-* variables
          may appear on the portal root. */}
      <Menu>
        <MenuButton id="host-menu-button" style={{ marginBottom: 12 }}>
          Host dropdown (leakage probe)
        </MenuButton>
        <MenuItems anchor="bottom start" id="host-menu-panel">
          <MenuItem>
            <p id="host-menu-paragraph">Host paragraph — default margins must survive.</p>
          </MenuItem>
          <MenuItem>
            <button id="host-menu-native-button" type="button">
              Host native button — default background must survive.
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
      <details open={!applied} style={{ marginBottom: 12, background: '#fff', padding: 12, borderRadius: 8 }}>
        <summary style={{ cursor: 'pointer' }}>
          Connection {conn ? `— board reports: ${conn}` : ''}
        </summary>
        {field('baseUrl', 'baseUrl')}
        {field('token', 'token', 'password')}
        {field('workspaceId', 'workspaceId')}
        {field('boardRef', 'boardRef')}
        <label style={{ display: 'block', margin: '6px 0', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={cfg.readOnly}
            onChange={(e) => setCfg({ ...cfg, readOnly: e.target.checked })}
          />{' '}
          readOnly
        </label>
        <label style={{ display: 'block', margin: '6px 0', fontSize: 13 }}>
          locale{' '}
          <select value={cfg.locale} onChange={(e) => setCfg({ ...cfg, locale: e.target.value as BoardLocale })}>
            <option value="en">en</option>
            <option value="zh">zh</option>
            <option value="ja">ja</option>
            <option value="ko">ko</option>
          </select>
        </label>
        <label style={{ display: 'block', margin: '6px 0', fontSize: 13 }}>
          second boardRef (multi-instance test){' '}
          <input value={secondBoard} onChange={(e) => setSecondBoard(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
        </label>
        <button onClick={apply} style={{ marginTop: 6 }}>
          Mount board(s)
        </button>
      </details>

      {applied && (
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ height: '78vh', flex: 1, border: '2px dashed #b8ac98', borderRadius: 8, overflow: 'hidden' }}>
            <JTypeBoard
              baseUrl={applied.baseUrl}
              token={applied.token}
              workspaceId={applied.workspaceId}
              boardRef={applied.boardRef}
              readOnly={applied.readOnly}
              live={true}
              locale={applied.locale}
              onConnectionChange={setConn}
            />
          </div>
          {secondBoard && (
            <div style={{ height: '78vh', flex: 1, border: '2px dashed #98a8b8', borderRadius: 8, overflow: 'hidden' }}>
              <JTypeBoard
                baseUrl={applied.baseUrl}
                token={applied.token}
                workspaceId={applied.workspaceId}
                boardRef={secondBoard}
                readOnly={applied.readOnly}
                live={true}
                locale={applied.locale}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
