import axios from "axios"

import "../sass/LoginPage.scss"
import { useEffect, useState } from "react"
import { SERVER_URL, lockScroll, unlockScroll } from "./App"
import StatefulInput from "../components/StatefulInput"
import { useLocation, useNavigate } from "react-router-dom"
import RedX from '../images/RedX.png'
import { redirectIfAlreadyLoggedIn } from "../middleware/AuthenticationMiddleware"

function LoginPage({ }) {

    const navigate = useNavigate();

    const location = useLocation();

    const state = location.state ?? {};

    const [userName, setUserName] = useState("GarnetTheYet")
    const [password, setPassword] = useState("Dangman101")

    async function postLogin() {

        const loginData = { userName, password }

        try {
            const response = await axios.post(`${SERVER_URL}/auth/login`, loginData);
            console.log("Login response", response.data)
            navigate('/authTest')
        }
        catch (err) {
            console.log("Login error", err?.response?.data)
        }
    }

    return (
        <div className="login-page-container">
            <div className="login-page">
                {state.authRejected && <SessionExpiredModal authError={state.authRejected} />}
                <StatefulInput className="login-input" type="text" state={userName} setState={setUserName} />
                <StatefulInput className="login-input" type="password" state={password} setState={setPassword} />
                <button className="responsive-button btn-blue hover-dim" onClick={postLogin}>Log in</button>
            </div>
        </div>
    )
}

// We actually may want the cookie to last longer than the session. Then we have more info about if
// the session expired or if they weren't logged in to begin with

// When they close the modal it should navigate to login page but with cleared state
function SessionExpiredModal({ authError }) {

    let { errorType, errorMessage } = authError;

    const navigate = useNavigate();

    let headingText, description;

    switch (errorType) {
        case "sessionExpired":
            headingText = "Your session has expired";
            description = `For your safety, sessions expire every 15 minutes. Sessions refresh every time you perform an action. Please log back in to continue.`
            break;
        case "notLoggedIn":
            headingText = "Not Authorized";
            description = `You must be logged in to view this page. Please log in to continue.`
            break;
        case "database":
            headingText = "Internal Authentication Error";
            description = `An internal database error occured with your session. ${errorMessage}. Please log back in to continue.`
            break;
        case "incompleteAuth":
            headingText = "Incomplete Authentication";
            description = `${errorMessage}. Please log back in to continue`
            break;
        case "verification":
            headingText = "Session Verification Error";
            description = `${errorMessage}. Please log back in to continue.`
            break;
        case "sessionNotFound":
            headingText = "Session Not Found";
            description = `Your session cookie is valid but the session no longer exists. Please log back in to continue.`
            break;
        case "sessionCanceled":
            headingText = "Session Canceled";
            description = `Your session has been manually canceled. Please log back in to continue.`
            break;
    }

    useEffect(() => {
        lockScroll();
        return () => unlockScroll();
    }, []);

    // Clear state by navigating to same page with empty state. This is so subsequent refreshes (or history < then > (back then forth) wont cause)
    // The modal to open back up
    const onButtonClick = () => {
        navigate("/login", { replace: true, state: {} })
    }

    return (
        <div className="fixed-info-overlay">
            <div className="container">
                <div className="fixed-info-container">
                    <div className="auth-rejected-popup-container">
                        <img className="auth-rejected-image" src={RedX} />
                        <h4 className="auth-rejected-heading py-2">{headingText}</h4>
                        <p className="auth-rejected-quote">
                            {description}
                        </p>
                        <button className="responsive-button hover-dim auth-rejected-button" onClick={onButtonClick}><span>Back to Login</span></button>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default redirectIfAlreadyLoggedIn(LoginPage, "/dashboard");