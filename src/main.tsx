import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'

createRoot(document.getElementById('root')!).render(
  // Pas de StrictMode : le double montage casse les libellés <Html> de drei avec React 19 (erreurs « synchronously unmount »).
  <App />,
)
