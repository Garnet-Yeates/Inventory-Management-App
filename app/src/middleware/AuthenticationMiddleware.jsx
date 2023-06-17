import axios from "axios";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "../pages/App";
import { mountAbortSignal } from "../tools/axiosTools.js";

console.log("middleware init")

// Set when script is loaded (when imported from App.jsx)
axios.defaults.withCredentials = true;

// Used for my Auth testing page
export const authTamperingSettings = { tamperWithCSRFHeader: false, sendCSRFHeader: true }

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
 * This component should be placed inside of a `BrowserRouter` component so the navigate function works properly
 */
export function AuthAxiosInterceptor() {

    const navigate = useNavigate();

    useEffect(() => {

        const reqIntId = axios.interceptors.request.use(function addCsrfHeader(config) {

            let auth_csrf_cookie = Cookies.get('auth_csrf');

            if (authTamperingSettings.tamperWithCSRFHeader) {
                auth_csrf_cookie = "tampered" // Doesn't actually modify the cookie, just the reference to the cookie's value that we have here
            }

            if (auth_csrf_cookie && authTamperingSettings.sendCSRFHeader) {
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

/**
 * This higher order component function can wrap any page component that wants to redirect away from that page if the
 * user is already logged in. Examples of this are the register and login pages. Please note that this must be inside of
 * a `BrowserRouter` component since it uses navigate from react-router-dom.
 */
export function redirectIfAlreadyLoggedIn(Component, redirectTo) {

    return mountAuthDetector(
        Component,
        {
            redirectIf: "loggedIn", 
            redirectTo,
            redirectOptions: {
                replace: true,
                state: {
                    alreadyLoggedInNotice: "Already logged in"
                }
            }
        }
    )
}

/**
 * This higher order component function can wrap any component that wants to check (on mount) if the user is logged in.
 * This component will pass down a prop to your component called 'loggedIn'. First it will make a client-sided
 * assumption of whether or not the user is logged in, based on the existence of the csrf cookie. However upon mounting
 * it will make a REST call to check if the user is logged in, so if the cookie is invalid or other pieces of auth
 * are missing, the prop will be updated. If `safe` is set to true, no client side assumption will be made 
 * 
 * I mainly use this for the home page. For example some components will be wrapped with authDetector HOC so that
 * if you are logged in it will show "Go to dashboard" but if not it will show "Register/Login" buttons
 */
export function mountAuthDetector(Component, redirectInfo, safe = true) {

    // redirectOn: "loggedIn" OR "loggedOut"
    const { redirectIf, redirectTo, redirectOptions } = redirectInfo;

    return function Hoc(props) {

        const navigate = useNavigate();

        const auth_csrf_cookie = Cookies.get('auth_csrf');

        // If safe mode is off, loggedIn initial state will depend on the presence of the csrf cookie
        const [loggedIn, setLoggedIn] = useState(safe ? false : auth_csrf_cookie)

        useEffect(() => {

            const { controller, isMounted, cleanup } = mountAbortSignal(5);

            const fetchData = async () => {

                try {
                    const { loggedIn } = (await axios.get(`${SERVER_URL}/auth/loggedInCheck`, { signal: controller.signal })).data

                    if (isMounted()) {
                        if (redirectInfo && (loggedIn && redirectIf.toLowerCase() === "loggedin") || (!loggedIn && redirectIf.toLowerCase() == "loggediut")) {
                            navigate(redirectTo, redirectOptions);
                        }
                        else {
                            setLoggedIn(loggedIn)
                        }
                    }
                }
                catch (err) {
                    if (axios.isCancel(err)) return console.log(`Request canceled due to ${isMounted() ? "timeout" : "unmount"}`, err);
                    console.log("Error at GET /auth/loggedInCheck", err);
                }
            }

            fetchData()

            return cleanup;

        }, [navigate])

        return <Component {...props} loggedIn={loggedIn} />
    }
}