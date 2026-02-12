import '@testing-library/jest-dom';

// Mock localStorage if missing or broken in jsdom environment
if (!global.localStorage || typeof global.localStorage.getItem !== 'function') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  };
}
