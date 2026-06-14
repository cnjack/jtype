// Maps the string `icon` names stored in category metadata to heroicon
// components (keeps the content registry free of React imports).

import type { ComponentType, SVGProps } from 'react'
import {
  BookOpenIcon,
  CloudArrowUpIcon,
  CommandLineIcon,
  FolderOpenIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
  SparklesIcon,
  ViewColumnsIcon,
} from '@heroicons/react/24/outline'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const ICONS: Record<string, IconComponent> = {
  RocketLaunch: RocketLaunchIcon,
  FolderOpen: FolderOpenIcon,
  CloudArrowUp: CloudArrowUpIcon,
  ViewColumns: ViewColumnsIcon,
  GlobeAlt: GlobeAltIcon,
  Sparkles: SparklesIcon,
  CommandLine: CommandLineIcon,
}

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? BookOpenIcon
  return <Icon className={className} aria-hidden="true" />
}
