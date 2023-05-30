import axios from "axios"

import Cookies from "js-cookie"
import "../sass/AuthTestPage.scss"
import { SERVER_URL, lockScroll, unlockScroll } from "./App"
import { authTamperingSettings } from "../middleware/AuthenticationMiddleware"
import { useState } from "react"

function AuthTestPage({ }) {

    const [tamperedCSRF, setTamperedCSRF] = useState(authTamperingSettings.tamperWithCSRFHeader);

    const [sendingCSRF, setSendingCSRF] = useState(authTamperingSettings.sendCSRFHeader)

    const [cookieRemoved, setCookieRemoved] = useState(!Cookies.get("auth_csrf"));

    return (
        <div className="auth-test-page-container">
            <div className="auth-test-page">
                <div className="container d-flex flex-column align-items-center">
                    <div className="auth-test-container">
                        <h3 className="auth-test-heading py-2">
                            Auth Test
                        </h3>
                        <div className="container-fluid button-container">
                            <div className="row gy-2 justify-content-center">
                                <div className="col-sm-6">
                                    <AuthTestButton buttonText="Auth Required" onClick={() => authRequiredEndpoint()} />
                                </div>
                                <div className="col-sm-6">
                                    <AuthTestButton buttonText="Logged In Check" onClick={() => authenticatedCheck(setCookieRemoved)} />
                                </div>
                                <div className="col-sm-6">
                                    <AuthTestButton buttonText="Log Out" onClick={() => logOut(setCookieRemoved)} />
                                </div>
                                <div className="col-sm-6">
                                    <AuthTestButton buttonText="CSRF Cookie Check" onClick={() => cookieCheck()} />
                                </div>
                                <div className="col-xl-6">
                                    <AuthTestButton buttonText={`${!tamperedCSRF ? "Tamper" : "Fix"} CSRF Header`} onClick={() => toggleCSRFTamper(setTamperedCSRF)} />
                                </div>
                                <div className="col-xl-6">
                                    <AuthTestButton buttonText={`${sendingCSRF ? "Remove" : "Restore"} CSRF Header`} onClick={() => toggleCSRFSending(setSendingCSRF)} />
                                </div>
                                <div className="col-xl-6">
                                    <AuthTestButton buttonText="Remove CSRF Cookie" onClick={() => removeCSRFCookie(setCookieRemoved)} disabled={cookieRemoved}/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

async function authenticatedCheck(setCookieRemoved) {
    try {
        const response = await axios.get(`${SERVER_URL}/auth/loggedInCheck`);
        console.log("/auth/loggedInCheck response", response.data)
        setCookieRemoved(!Cookies.get("auth_csrf")) //  auth check may notice we had a bad session and silently remove the cookie so we must update that info
    }
    catch (err) {
        console.log("Error with GET /auth/loggedInCheck", err?.response?.data)
    }
}

function cookieCheck() {
    console.log(Cookies.get("auth_csrf"))
}

function toggleCSRFSending(setSendingCSRF) {
    setSendingCSRF(oldValue => !oldValue);
    authTamperingSettings.sendCSRFHeader = !authTamperingSettings.sendCSRFHeader
    console.log("Set CSRF sending to", authTamperingSettings.sendCSRFHeader)
}

function removeCSRFCookie(setCookieRemoved) {
    Cookies.remove("auth_csrf")
    console.log("auth_csrf cookie removed")
    setCookieRemoved(true)
}

function toggleCSRFTamper(setTamperedCSRF) {
    setTamperedCSRF(oldValue => !oldValue);
    authTamperingSettings.tamperWithCSRFHeader = !authTamperingSettings.tamperWithCSRFHeader
    console.log("CSRF tampering set to", authTamperingSettings.tamperWithCSRFHeader)
}

async function authRequiredEndpoint() {
    try {
        const response = await axios.get(`${SERVER_URL}/auth/test`);
        console.log("/auth/test response", response.data)
    }
    catch (err) {
        console.log(err);
        console.log("Error with GET /auth/test", err?.response?.data)
    }
}

async function logOut(setCookieRemoved) {
    try {
        const response = await axios.get(`${SERVER_URL}/auth/logout`);
        console.log("/auth/logout response", response.data)
        setCookieRemoved(!Cookies.get("auth_csrf")) // logout will remove our cookie 
    }
    catch (err) {
        console.log("Error with GET /auth/logout", err?.response?.data)
    }
}


function AuthTestButton({ buttonText, onClick, buttonClasses, buttonStyle, disabled }) {
    return (
        <div className="d-flex flex-column align-items-center">
            <button disabled={disabled} onClick={onClick} style={buttonStyle} className={"responsive-button hover-dim auth-test-button" + (buttonClasses ? ` ${buttonClasses}` : "")}>
                <span>
                    {buttonText}
                </span>
            </button>
        </div>
    )
}

export default AuthTestPage;