import '@testing-library/jest-dom';

// Mock window.open to avoid popup blockers in tests
window.open = vi.fn(() => ({
  document: {
    write: vi.fn(),
    close: vi.fn(),
  },
  focus: vi.fn(),
  print: vi.fn(),
  close: vi.fn(),
}));

// Mock scrollTo to avoid jsdom errors
window.scrollTo = vi.fn();

// Ensure document.getElementById('copy-label') always returns a safe element
const originalGetElementById = document.getElementById.bind(document);
document.getElementById = (id) => {
  const el = originalGetElementById(id);
  if (el) return el;
  if (id === 'copy-label') {
    const span = document.createElement('span');
    span.id = 'copy-label';
    document.body.appendChild(span);
    return span;
  }
  return el;
};
