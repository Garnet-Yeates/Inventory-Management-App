import Cookies from 'js-cookie';
import axios from "axios";

// Request onFulfilled interceptor (basically every request we send)
// Checks if the auth_csrf cookie exists and if it does it will add auth_csrf header
const addCsrfHeader = function(config) {

    const auth_csrf_cookie = Cookies.get('auth_csrf');

    console.log("(INTERCEPT OUT) AUTH CSRF COOKIE: ", auth_csrf_cookie)

    if (auth_csrf_cookie) {
        console.log("(INTERCEPT OUT) SET HEADER")
        config.headers["auth_csrf"] = auth_csrf_cookie;
    }

    return config;
}

// Response onRejected interceptor (when receiving status codes not in the 200's)
// Checks if response.data contains authRejected flag. If it does we redirect to login
// ANY secure API endpoint may send back a 40X code saying authRejected so this can happen
// on almost all pages (see authCheck middleware in server) 
const checkAuthRejected = function(error) {

    if (error?.response?.data) {

        const data = error.response.data;

        // authRejected can be sent for multiple reasons, see the server authCheck middleware 
        if (data.authRejected) {
            // Cookies are deleted by the server middleware automatically. It is up to the client to perform the redirect here
            error.authRedirected = true;
            window.location.href=("/login")
        }
    }

    return Promise.reject(error);
}

export default function RegisterInterceptors() {
    axios.interceptors.request.use(addCsrfHeader);
    axios.interceptors.response.use(null, checkAuthRejected);
}