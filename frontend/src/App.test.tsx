import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function renderApp() {
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe('App', () => {
  it('renders Hello Deadlands heading', () => {
    renderApp();
    expect(screen.getByText('Hello Deadlands')).toBeInTheDocument();
  });

  it('renders version number', () => {
    renderApp();
    expect(screen.getByText('v2.0.0-SNAPSHOT')).toBeInTheDocument();
  });
});
