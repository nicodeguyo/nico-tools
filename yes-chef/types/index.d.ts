declare module 'claude-code' {
  interface PluginState {
    'yes-chef': {
      isOff: boolean
      isCheckDue: boolean
      isWaiting: boolean
      stage: 'none' | 'round' | 'ticket'
      hasLesson: boolean
      lessonCount: number
    }
  }
}
