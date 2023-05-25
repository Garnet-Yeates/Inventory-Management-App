import '../sass/App.scss'
import { BrowserRouter as Router, Route, Routes, useFetcher } from 'react-router-dom';

import axios from "axios";
import RegisterInterceptors from '../middleware/authInterceptors';
import RegisterPage from './Register';
import LoginPage from './Login';
import NotFoundPage from './NotFound';
import HomePage from './HomePage';
import { useEffect } from 'react';

export const SERVER_URL = "http://localhost:4000"

axios.defaults.withCredentials=true;
RegisterInterceptors();

function App() {
    return (
        <div id='app-wrapper'>
          <Router>
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

export default App;
