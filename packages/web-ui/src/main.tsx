import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('The #root element is missing from index.html.');
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
