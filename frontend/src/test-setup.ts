/**
 * Test Setup (FE-PR 0.2)
 *
 * Configures testing-library matchers for vitest.
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
