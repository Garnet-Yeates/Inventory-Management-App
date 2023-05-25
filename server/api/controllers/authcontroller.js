import bcrypt from 'bcrypt'
import { SessionDurationMinutes, authCheckHelper } from '../middleware/authCheck.js';
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';
import { currentTimeSeconds, minutesFromNow } from '../../utilities.js';
import { db } from '../../server.js';
import { createClient, findClient } from '../tools/database/tblClientProcedures.js';
import { createSession } from '../tools/database/tblSessionProcedures.js.js';

const userNameRegex = /^[a-zA-Z][a-zA-Z0-9_]+$/

const clientNameRegex = /^[a-zA-Z0-9_ ]+$/

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d!@#$%^&*()\[\]{}\\\/.,<>_+=\-;:~ ])[\w\d!@#$%^&*()\[\]{}\\\/.,<>_+=\-;:]+$/

// GET /auth/test
export async function authRequiredTest(req, res) {
    res.status(200).json({ success: "Auth middleware test successful" });
}

export async function register(req, res) {

    const { clientName, userName, password } = req.body;

    const userNameErrors = [];
    const passwordErrors = [];
    const clientNameErrors = [];
    const databaseErrors = [];
    const errJson = {};

    if (clientName.length < 5 || clientName.length > 32) {
        clientNameErrors.push("Client name must be between 5 and 32 characters")
    }

    if (!clientNameRegex.exec(clientName)) {
        clientNameErrors.push("Client name must be alphanumeric (may contain spaces or underscore)")
    }

    if (userName.length < 5 || userName.length > 16) {
        userNameErrors.push("Username must be between 5 and 16 characters")
    }

    if (!userNameRegex.exec(userName)) {
        userNameErrors.push("Username must start with a letter and be alphanumeric (underscore allowed)")
    }

    let user = await findClient({ userName });
    if (user && user.sqlError) {
        databaseErrors.push("Error querying database for existing user check")
    }
    else if (user) {
        userNameErrors.push("Username is taken")
    }

    if (password.length < 10 || password.length > 16) {
        passwordErrors.push("Password must be between 10 and 16 characters")
    }

    if (password.includes(`"`) || password.includes(`'`) || password.includes("`")) {
        passwordErrors.push(`Quotation characters ', ", and ${"`"} are not allowed in the password`)
    }

    if (!passwordRegex.exec(password)) {
        passwordErrors.push("Password must contain at least one uppercase letter and one lowercase letter, as well as a number or special character")
    }

    let noErrors = () => databaseErrors.length == 0 && clientNameErrors.length == 0 && userNameErrors.length == 0 && passwordErrors.length == 0;

    if (noErrors() && await createClient(clientName, userName, password).sqlError) {
        errJson.databaseErrors.push("Error inserting new user into the database")
    }

    databaseErrors.length > 0 && (errJson.databaseErrors = databaseErrors);
    clientNameErrors.length > 0 && (errJson.clientNameErrors = clientNameErrors);
    userNameErrors.length > 0 && (errJson.userNameErrors = userNameErrors);
    passwordErrors.length > 0 && (errJson.passwordErrors = passwordErrors);

    // If any errors, return errJson
    if (!noErrors) {
        return res.status(400).json(errJson);
    }

    return res.status(200).json({ message: "You did it!" });
}

// Should be requested upon the mounting of register and login pages
// If badAuth property exists in the response, the client shoud clear the csrf header from axios
// if loggedIn property exists in the response, the client should redirect to the user's dashboard
// if notLoggedIn property exists in the response, do nothing
export async function alreadyLoggedInCheck(req, res) {

    const authJWTCookie = req.cookies["auth_jwt"];
    const authCSRFCookie = req.cookies["auth_csrf"];
    const authCSRFHeader = req.headers["auth_csrf"];

    let authCheckResult;
    if (authJWTCookie || authCSRFCookie || authCSRFHeader) {
        authCheckResult = authCheckHelper(req);
    }
    else {
        return res.status(200).json({ notLoggedIn: "You are not logged in " })
    }

    if (!authCheckResult) {
        authJWTCookie && res.clearCookie("auth_jwt")
        authCSRFCookie && res.clearCookie("auth_csrf")
        return res.status(200).json({ authRejected: "Login session / cookies cleared " })
    }
    else {
        return res.status(200).json({ loggedIn: "You are already logged in" })
    }
}

// POST /auth/login
export async function login(req, res) {

    // Possibly deny request if they already have a session
    const { userName, password } = req.body;

    let user = await findClient({ userName });
    if (!user) {
        return res.status(404).json({ errorMessage: "Username or password is incorrect" })
    }
    else if (user.sqlError) {
        return res.status(500).json({ errorMessage: "Error querying database for user" })
    }

    if (!await bcrypt.compare(password, user.hashPassword)) {
        return res.status(404).json({ errorMessage: "Incorrect username or password" })
    }

    if (!await createSessionAndSetCookies(user, res)) {
        return res.status(500).json({ databaseError: "Error inserting session into database" })
    }

    return res.status(200).json({ msg: "It is done" });
}

// Returns { token, decoded } or false if there was an sql error
export async function createSessionAndSetCookies(client, res) {

    const session = await createSession(client)
    if (session.sqlError)  {
        return false;
    }
    
    // Session returns [ token, decodedToken ]. We only destructure CSRF out of decodedToken here
    const [ token, { sessionCSRF } ] = session;

    res.cookie("auth_jwt", token, { httpOnly: true, maxAge: 1000 * 60 * (SessionDurationMinutes) - 5000 });
    res.cookie("auth_csrf", sessionCSRF, { httpOnly: false, maxAge: 1000 * 60 * (SessionDurationMinutes) - 5000 });

    return true;
}