import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import { handleAuthFragmentOnLoad } from './context/AuthContext';
import './index.css';

// Safety net: when GIS library cannot auto-process the #id_token=...
// fragment (incognito, ITP, third-party cookie blocking), parse it
// ourselves before React mounts so the user is signed in by the time
// AuthProvider's onAuthStateChanged listener runs.
handleAuthFragmentOnLoad();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="top-center" richColors />
  </StrictMode>,
);
