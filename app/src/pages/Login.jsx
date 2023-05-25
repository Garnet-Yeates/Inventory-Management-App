import axios from "axios"

import Cookies from "js-cookie"
import "../sass/Login.scss"
import { useState } from "react"
import { SERVER_URL } from "./App"

function LoginPage({ }) {

    const [userName, setUserName] = useState("GarnetTheYet")
    const [password, setPassword] = useState("Dangman101")

    async function postLogin() {

        const loginData = { userName, password }

        try {
            const response = await axios.post(`${SERVER_URL}/auth/login`, loginData);
            console.log("/auth/login response", response.data)
        }
        catch (err) {
            console.log("Error with POST to /auth/login", err?.response?.data)
        }
    }

    function cookieCheck() {
        console.log(Cookies.get("auth_csrf"))
    }

    async function authenticatedCheck() {
        try {
            const response = await axios.get(`${SERVER_URL}/auth/loggedInCheck`);
            console.log("/auth/loggedInCheck response", response.data)
        }
        catch (err) {
            console.log("Error with GET /auth/loggedInCheck", err?.response?.data)
        }
    }

    async function authRequiredEndpoint() {
        try {
            const response = await axios.get(`${SERVER_URL}/auth/test`);
            console.log("/auth/test response", response.data)
        }
        catch (err) {
            console.log("Error with GET /auth/loggedInCheck", err?.response?.data)
            console.log("err.dealtWith", err.dealtWith)
        }
    }

    return (
        <div className="login-page">
            <StateInput className="" type="text" state={userName} setState={setUserName} />
            <StateInput className="" type="password" state={password} setState={setPassword} />
            <button onClick={postLogin}>Log in</button>
            <button onClick={cookieCheck}>Cookie check</button>
            <button onClick={authenticatedCheck}>Logged in check</button>
            <button onClick={authRequiredEndpoint}>Auth Required</button>
        </div>
    )
}

function StateInput({ className, state, setState, type }) {
    if (type !== "password" && type !== "text") throw new Error("");
    const onChange = (event) => setState(event.target.value)
    return <input className={className} type={type} value={state} onChange={onChange} />
}

export default LoginPage;