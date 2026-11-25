import { CalendarDays, CheckSquare, HandHeart, LayoutDashboard, Settings, Sparkles, Users2 } from 'lucide-react'
import type { ElementType } from 'react'

export interface NavItem {
  to: string
  label: string
  title: string
  subtitle: string
  icon: ElementType
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', title: 'Dashboard', subtitle: 'Everything the agent sees right now.', icon: LayoutDashboard },
  { to: '/clubs', label: 'Clubs', title: 'Clubs', subtitle: 'Membership, budgets and explainable health scores.', icon: Users2 },
  { to: '/events', label: 'Events', title: 'Events', subtitle: 'Schedule, venues and clash detection.', icon: CalendarDays },
  { to: '/volunteers', label: 'Volunteers', title: 'Volunteers', subtitle: 'Skills, availability and event assignments.', icon: HandHeart },
  { to: '/assistant', label: 'AI Assistant', title: 'AI Assistant', subtitle: 'Ask questions. The agent only suggests — humans decide.', icon: Sparkles },
  { to: '/approvals', label: 'Approvals', title: 'Approvals', subtitle: 'Nothing changes until a human approves.', icon: CheckSquare },
  { to: '/settings', label: 'Settings', title: 'Settings', subtitle: 'Connection, session and platform details.', icon: Settings },
]
