import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/base.css'
import './styles/nav.css'
import './styles/pages.css'
import './styles/player.css'
import './styles/touch.css'

createRoot(document.getElementById('root')!).render(<App />)
