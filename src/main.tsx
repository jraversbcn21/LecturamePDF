import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Falta #root en index.html');

createRoot(container).render(<App />);
