import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Phaser globally since tests don't need the full game engine
global.Phaser = {
  AUTO: 0,
  Scale: {
    FIT: 0,
    CENTER_BOTH: 0,
  },
  Game: class MockGame {
    constructor() {}
    events = {
      on: () => {},
      emit: () => {},
      off: () => {},
    };
    destroy = () => {};
  },
} as any;
