import axios from 'axios'

export const api = axios.create({
  baseURL: '/backend',
  timeout: 8000,
  headers: { Accept: 'application/json' },
})

export async function fetchPrometheus(path) {
  const response = await fetch(`/prometheus${path}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Prometheus returned HTTP ${response.status}`)
  return response.json()
}

export function formatTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
