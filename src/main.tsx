import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Falta #root en index.html');

registerSW({ immediate: true });

createRoot(container).render(<App />);
