import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const storedTheme = window.localStorage.getItem('dtms-theme');
const initialTheme = storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light';
document.documentElement.dataset.theme = initialTheme;
document.documentElement.style.colorScheme = initialTheme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
