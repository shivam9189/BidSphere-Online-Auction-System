// Ensures the Vite main entrypoint boots React correctly.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock }));

vi.mock('react-toastify', () => ({ ToastContainer: () => null }));
vi.mock('react-toastify/dist/ReactToastify.css', () => ({}), { virtual: true });
vi.mock('../index.css', () => ({}), { virtual: true });
vi.mock('../App.jsx', () => ({ default: () => null }));
vi.mock('react-router-dom', () => ({ BrowserRouter: ({ children }) => children }));
vi.mock('react-dom/client', () => ({
  default: { createRoot: createRootMock },
  createRoot: createRootMock,
}));

describe('main entrypoint', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    vi.resetModules();
    renderMock.mockClear();
    createRootMock.mockClear();
  });

  it('creates a React root and renders the app shell', async () => {
    await import('../main.jsx');

    const rootEl = document.getElementById('root');
    expect(createRootMock).toHaveBeenCalledWith(rootEl);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });
});
