import bcrypt from 'bcrypt'
import { authCheckHelper, shouldAttemptAuth } from '../middleware/authCheck.js';
import { createClient, findClient } from '../tools/database/tblClientProcedures.js';
import { createSession, deleteSession } from '../tools/database/tblSessionProcedures.js.js';

const userNameRegex = /^[a-zA-Z][a-zA-Z0-9_]+$/

const clientNameRegex = /^[a-zA-Z0-9_ ]+$/

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d!@#$%^&*()\[\]{}\\\/.,<>_+=\-;:~ ])[\w\d!@#$%^&*()\[\]{}\\\/.,<>_+=\-;:]+$/

// GET /auth/test
export async function authRequiredTest(req, res) {
    res.status(200).json({ success: "Auth middleware test successful" });
}

/**
 * `POST` `/auth/register` 
 * Attempts to register a new user. The fields for this request in `req.body` are as follows
 * 
 * `clientName`: 5-32 characters, required
 * 
 * `userName`: 5-32 characters, required, unique
 * 
 * `password`: 8-16 characters, required
 * 
 * `clientName`, `userName`, and `password` all must conform to their respective regular expressions
 * for validation.
 * 
 * `clientName` must be alphanumeric, spaces and numbers are allowed but special characters are not
 * 
 * `userName` must also be alphanumeric, but it must start with a letter and cannot contain spaces (underscore allowed)
 * 
 * `password` must contain an uppercase letter and a lowercase letter. It must also contain either a number or a special character.
 * Most special characters are allowed but quotation characters (backticks, single, double) quotes are not allowed.
 * 
 * This API endpoint will return `200` upon successful registration
 * 
 * This API endpoint will return `400` for most error cases such as invalid client name, client name taken, regexs not matching
 * 
 * This API endpoint will return `500` if database errors occur (keep in mind that database errors AND client side errors may both
 * occur in one request, but the 500 code takes precedence because it is more serious)
 */
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
        return res.status(databaseErrors ? 500 : 400).json(errJson);
    }

    return res.status(200).json({ message: "You did it!" });
}

/**
 * `POST` `/auth/login` 
 * 
 * Req.body should look like:
 * 
 * `userName`: 5-16 characters, required
 * 
 * `password`: 8-16 characters, required
 * 
 * If login is successful, it will insert a new session into the database and set the two session cookies in the
 * user's browser (it is up to the user to set the CSRF header on subsequent requests, effectively proving that they
 * can read the cookie)
 * 
 * This endpoint will return a `200` status code upon login success
 * 
 * This endpoint will return a `404` code if the username or password is incorrect
 * 
 * This endpoint will return a `500` if it runs into an SQL errror querying the user or inserting the new session
 */
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

/**
 * `GET` `/auth/logout` 
 * 
 * Attempts to log out a user. No fields are required for this request since the 3 things we use
 * for authorization (CSRF cookie, JWT cookie, CSRF header) are automatically included in requests.
 * This API endpoint will never return an error, even if the user wasn't logged in or even if there
 * was an error querying the database to find OR delete the session (realistically we will never get sql error,
 * but even if we did we don't want that to prevent them from logging out)
 */
export async function logout(req, res) {

    // If they didn't supply ANY credentials at all we don't need to run the auth check - we know they aren't logged in
    if (!shouldAttemptAuth(req)) {
        return res.status(200).json({ loggedOut: "You weren't even logged in" })
    }

    // With these options: authCheckHelper does not do much, besides returning existing session if it exists.
    // Clearing cookies and responding is up to us
    const authCheckResult = await authCheckHelper(req, res, { sendResOnFail: false, deleteCookiesOnFail: false });

    res.clearCookie("auth_jwt")
    res.clearCookie("auth_csrf")

    // We do not need to do anything else if authCheck fails due to db error, auth rejection, session expired
    // Since we are logging out anyways. We only use authCheck to get sessionId so we can delete it manually
    if (!authCheckResult) {
        return;
    }

    const { sessionId } = authCheckResult;

    // Even if deleteSession has an SQL error we will still return 200 OK because sessions are auto deleted
    // whenever the server restarts anyways so we don't care if it failed
    await deleteSession(sessionId)

    return res.status(200).json({ loggedOut: "You have successfully logged out" })
}

/**
 * `GET` `/auth/loggedInCheck`
 * 
 * Used by the higher order component, `redirectIfLoggedIn`. Upon mounting, this component will make
 * a GET request to this endpoint. This endpoint will return an object containing ONE of the following properties:
 * 
 * `notLoggedIn`: "user is not logged in"
 * 
 * `badAuth`: "user has been logged out automatically"
 * 
 * `loggedIn`: "the user is already logged in"
 *
 * `badAuth` is treated the same as `notLoggedIn` by the HOC, it is just for informative purposes if we decide to do
 * something with it
 * 
 * If `loggedIn` property is returned, then the HOC will perform the redirect
 */
export async function loggedInCheck(req, res) {

    // If they didn't supply ANY credentials at all we don't need to run the auth check - we know they aren't logged in
    if (!shouldAttemptAuth(req)) {
        return res.status(200).json({ notLoggedIn: "You are not logged in" })
    }

    // With these options: cookies will be deleted on any form of failure (including db error) but we will deal with the response on our own
    const authCheckSuccess = await authCheckHelper(req, res, { sendResOnFail: false, deleteCookiesOnFail: true });

    if (!authCheckSuccess) {
        return res.status(200).json({ badAuth: "Login session cleared due to auth rejection or DB error" })
    }

    return res.status(200).json({ loggedIn: "You are already logged in" })
}

// Returns { token, decoded } or false if there was an sql error
export async function createSessionAndSetCookies(client, res) {

    const session = await createSession(client)
    if (session.sqlError) {
        return false;
    }

    // Session returns [ token, decodedToken ]. We only destructure CSRF out of decodedToken here
    const [token, { sessionCSRF }] = session;

    // Session cookie lasts 3 hours while session in database lasts 15 minutes
    // If cookie exists but session expires they will get "Session Expired" modal
    // If cookie no longer exists they will get "Not Authorized" modal4
    // This means:
    // If they come back after 15 mins of their last request, but also within 3 hours of their last request they get "Session Expired modal"
    // If they come back after 3 hours it will simply tell them they aren't logged in
    res.cookie("auth_jwt", token, { httpOnly: true, maxAge: 1000 * 60 * (180) });
    res.cookie("auth_csrf", sessionCSRF, { httpOnly: false, maxAge: 1000 * 60 * (180) });

    return true;
}