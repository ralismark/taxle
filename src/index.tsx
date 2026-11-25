import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { App } from './App';

let container = document.body;
let root = createRoot(container)
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
