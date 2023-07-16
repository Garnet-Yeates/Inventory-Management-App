import '../sass/App.scss'

import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';

import RegisterPage from './RegisterPage';
import LoginPage from './LoginPage';
import NotFoundPage from './NotFoundPage';
import HomePage from './HomePage';
import { AuthAxiosInterceptor } from '../middleware/AuthenticationMiddleware';
import DashboardPage from './DashboardPage';
import AuthTestPage from './AuthTestPage';
import { blue, green, pink, purple } from '@mui/material/colors';
import { createTheme } from '@mui/material';
import { ThemeProvider } from '@emotion/react';

export const SERVER_URL = "http://localhost:4000"

const theme = createTheme({
    palette: {
        primary: {
            main: blue[600],
            contrastText: '#ffffff',
        },
        secondary: {
            main: purple[600],
            contrastText: '#ffffff',
        },
        success: {
            main: green[600],
            contrastText: '#ffffff',
        },
        error: {
            main: pink[600],
            contrastText: '#ffffff',
        },
        // Used by `getContrastText()` to maximize the contrast between
        // the background and the text.
        contrastThreshold: 3,
        // Used by the functions below to shift a color's luminance by approximately
        // two indexes within its tonal palette.
        // E.g., shift from Red 500 to Red 300 or Red 700.
        tonalOffset: 0.2,
    },
});


function App() {
    return (
        <div id='app-wrapper'>
            <ThemeProvider theme={theme}>
                <Router>
                    <AuthAxiosInterceptor />
                    <Routes>
                        <Route path='/' element={<HomePage />} />
                        <Route path='/register' element={<RegisterPage />} />
                        <Route path='/dashboard' element={<DashboardPage />} />
                        <Route path='/authTest' element={<AuthTestPage />} />
                        <Route path='/login' element={<LoginPage />} />
                        <Route path='*' element={<NotFoundPage />} />
                    </Routes>
                </Router>
            </ThemeProvider>
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
