import './styles/main.css';
import { showOfflineReady, showUpdateReady, startApp } from './app/app.js';
import { registerPwa } from './app/pwa.js';

startApp();
registerPwa({ onOfflineReady: showOfflineReady, onUpdateReady: showUpdateReady });
