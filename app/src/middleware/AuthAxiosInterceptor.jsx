import axios from "axios";
import Cookies from "js-cookie";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Set when script is loaded (when imported from App.jsx)
axios.defaults.withCredentials = true;

/**
 * This component creates injectors for axios when it mounts. On mount, it will attach:
 * - an `onFulfilled` interceptor for sent requests that will add the csrfHeader (read from cookie) 
 * - an `onRejected` interceptor for received requests that will see if `error.response.data` has the `authRejected`
 *   property set. If it does it will set `error.canceled` to true redirect to the login page, sending error state.
 *   ALL axios post/get `catch` blocks in this web app should `return` if `error.canceled` is true unless you *want* to
 *   have the error handled twice)
 * 
 * The cleanup function returned by the mount effect will eject the current interceptors 
 * 
 * This component should be placed inside of a `Router` component so the navigate function works properly
 */
export default function AuthAxiosInterceptor() {

    const navigate = useNavigate();

    useEffect(() => {

        const reqIntId = axios.interceptors.request.use(function addCsrfHeader(config) {
            const auth_csrf_cookie = Cookies.get('auth_csrf');

            if (auth_csrf_cookie) {
                config.headers["auth_csrf"] = auth_csrf_cookie;
            }

            return config;
        })

        // Interlope the linear atrocities
        const resIntId = axios.interceptors.response.use(null, function checkAuthRejected(error) {

            // authRejected can be sent for multiple reasons, see the server authCheck middleware 
            if (error?.response?.data?.authRejected) {

                const { authRejected } = error.response.data;

                // Error.canceled basically says 'we dealt with this error'. Read the JSDoc for this Component for details
                error.canceled = true;

                // Cookies are deleted by the server middleware automatically upon auth rejection
                // it is up to the client to perform the redirect here after receiving an auth rejection
                navigate("/login", { replace: true, state: { authRejected } })
            }

            return Promise.reject(error);
        })

        return function cleanup() {
            axios.interceptors.request.eject(reqIntId)
            axios.interceptors.response.eject(resIntId)
        }

    }, [navigate])
}