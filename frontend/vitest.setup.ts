/**
 * Polyfill ResizeObserver for Vitest jsdom environment
 * Required by input-otp library used in login tests
 */
class ResizeObserverPolyfill {
  constructor(callback: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverPolyfill as any
