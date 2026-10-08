declare module 'claude-code' {
  interface PluginState {
    heard: { isOff: boolean; isBusy: boolean; isCheckDue: boolean }
  }
}
