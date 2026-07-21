export interface StreamState {
  cancelled: boolean
  pulls: number
}

const streamState: StreamState = {
  cancelled: false,
  pulls: 0,
}

export function getStreamState(): StreamState {
  return { ...streamState }
}

export function resetStreamState(): void {
  streamState.cancelled = false
  streamState.pulls = 0
}

export function recordStreamCancellation(): void {
  streamState.cancelled = true
}

export function recordStreamPull(): number {
  return ++streamState.pulls
}
