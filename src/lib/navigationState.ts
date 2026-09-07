import type { AppView } from '../types'

const APP_VIEWS: AppView[] = ['attendance', 'teams', 'players', 'guide']
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface NavigationState {
  view: AppView
  matchDate: string
}

const isValidDate = (value: string | null) => {
  if (!value || !DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const readNavigationState = (search: string, fallbackDate: string): NavigationState => {
  const params = new URLSearchParams(search)
  const requestedView = params.get('view') as AppView | null
  const requestedDate = params.get('date')

  return {
    view: requestedView && APP_VIEWS.includes(requestedView) ? requestedView : 'attendance',
    matchDate: isValidDate(requestedDate) ? requestedDate as string : fallbackDate,
  }
}

export const buildNavigationSearch = (
  currentSearch: string,
  view: AppView,
  matchDate: string,
) => {
  const params = new URLSearchParams(currentSearch)
  params.set('view', view)
  params.set('date', matchDate)
  return `?${params.toString()}`
}
