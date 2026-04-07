import '@testing-library/jest-dom';

// Provide a safe no-op alert so jsdom doesn't log "Not implemented: window.alert"
if (typeof globalThis.alert === 'undefined') {
	globalThis.alert = () => {};
}
