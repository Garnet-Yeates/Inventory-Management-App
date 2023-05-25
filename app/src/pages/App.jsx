import '../sass/App.scss'
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';

import RegisterPage from './Register';
import LoginPage from './Login';
import NotFoundPage from './NotFound';
import HomePage from './HomePage';
import AuthAxiosInterceptor from '../middleware/AuthAxiosInterceptor';

export const SERVER_URL = "http://localhost:4000"

function App() {
    return (
        <div id='app-wrapper'>
            <Router>
                <AuthAxiosInterceptor />
                <Routes>
                    <Route path='/' element={<HomePage />} />
                    <Route path='/register' element={<RegisterPage />} />
                    <Route path='/login' element={<LoginPage />} />
                    <Route path='*' element={<NotFoundPage />} />
                </Routes>
            </Router>
        </div>
    )
}

export const lockScroll = () => {
    const scrollBarCompensation = window.innerWidth - document.body.offsetWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollBarCompensation}px`;
}

export const unlockScroll = () => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = ''
}


export default App;
