import jwt from "jsonwebtoken";
import { currentTimeSeconds } from "../../utilities.js";
import { deleteSession, findSession, newSession } from "../tools/database/tblSessionProcedures.js";
import { getClient } from "../tools/database/tblClientProcedures.js";

/*
 * This javascript file has to do with authentication checking (on all requests), authentication failure, session creation (including setting cookies)
 * as well as session deletion and session refreshing.
 */

const exemptEndpoints = ['/', '/auth/register', '/auth/loggedInCheck', '/auth/login', '/auth/logout'];

/**
 * This middleware is responsible for making sure the user has a signed, valid session. This means they must have a valid auth_jwt cookie, auth_csrf cookie, 
 * as well as proof they can read the auth_csrf cookie (i.e, they must have the auth_csrf header whose value is equivalent to that of the auth_csrf cookie). 
 * The session must also exist in the database and not be `expired` or `canceled`. If there is any issue what-so-ever proving that they have a valid, active session
 * in the database, a `401 unauthorized` or a `500 database error` will be returned. Depending on the situation, the session may even be deleted on failure (e.g, 
 * they supplied a valid auth_jwt and their session exists, but they got the csrf header wrong. For their own safety the session will be removed). This middleware 
 * will be run on all endpoints besides 'exemptEndpoints' (places where auth/clientId won't be required)
 */
export default async function authCheck(req, res, next) {

    // Home, register, loggedInCheck, and login are exempt from this

    if (exemptEndpoints.includes(req.path)) return next();

    // AuthCheck will automatically send error messages, clear cookies, and delete sessions on failure with these options
    // Note that sessions are ALWAYS deleted on any form of auth fail (if valid JWT supplied), there is no option for it
    let authCheckResult = await authCheckHelper(req, res, { sendResOnFail: true, deleteCookiesOnFail: true });

    if (!authCheckResult) {
        return; // Simply return here becasuse we told authCheckHelper to send error responses for us
    }

    const { clientId, sessionUUID } = authCheckResult;

    // Wait 15 seconds before deleting the session upon refresh. This is so that if a chain of auth requests occur all using the 
    // same cookie (i.e, they all send before one of them resolves sets the new cookie in the browser), the other requests'
    // cookies aren't invalidated as a result of the deletion of the session that all the cookies were on
    //
    // Realized this concurrency error due to React's 'double-mount' in development mode, but it was a good catch :)
    deleteSessionSoon(sessionUUID)

    res.clearCookie("auth_csrf")
    res.clearCookie("auth_jwt")

    // Cookies already gone down here so authRejections do not need to remove them

    let user;
    try {
        user = await getClient({ clientId });
        if (!user) {
            return res.status(500).json({ authRejected: { errorType: "noUser", errorMessage: "Could not find user associated with the clientId tied to the session being updated" } })
        }
    }
    catch (err) {
        console.log(err)
        return res.status(500).json({ authRejected: { errorType: "database", errorMessage: "Error querying database for user associated with the clientId tied to the session being updated" } })
    }

    if (!await createSessionAndSetCookies(user, res)) {
        // Send authFailed here so that our interceptor brings them to the login page and displays error
        return res.status(500).json({ authRejected: { errorType: "database", errorMessage: "Error inserting new session into database upon session refresh" } })
    }

    // Next middleware if all is good 

    // Attach user to request
    req.auth = { clientId, sessionUUID };

    next();
}

/**
 * This function checks whether the user supplied any auth credentials. There are 3 credentials that they must supply
 * in total (csrf cookie, csrf header, httponly jwt cookie). If any are missing there will be auth errors. We use this
 * function to check if the user is attempting authorization. This is used to differentiate between users not being
 * logged in and users making an attempt to authenticate
 */
export function userSuppliedAnyAuth(req) {

    const authJWTCookie = req.cookies["auth_jwt"];
    const authCSRFCookie = req.cookies["auth_csrf"];
    const authCSRFHeader = req.headers["auth_csrf"];

    return authJWTCookie || authCSRFCookie || authCSRFHeader;
}

/**
 * NOT an api endpoint, rather a helper method. This function does the 'authorization' check to makes sure the user is authorized.
 * If there are ANY issues checking auth, including database errors, this function will return `false`
 * 
 * If the `sendResOnFail` option is set to true it will also send a 400 or 500 code on failure with JSON stating an authRejected property (on top of returning false)
 * 
 * If `deleteCookiesOnFail` it will also delete cookies on failure (on top of returning false)
 * 
 * @param {{sendResOnFail: boolean, deleteCookiesOnFail: boolean }} options 
 * @returns object containing SessionUUID and clientID upon success, or false upon failure
 */
export async function authCheckHelper(req, res, options) {

    const { sendResOnFail, deleteCookiesOnFail } = options;

    // Initialize these here so our first call to onAuthFailure can access sessionUUID
    let sessionUUID, sessionCSRF = null;

    const authJWTCookie = req.cookies["auth_jwt"];
    const authCSRFCookie = req.cookies["auth_csrf"];
    const authCSRFHeader = req.headers["auth_csrf"];

    if (!userSuppliedAnyAuth(req)) {
        sendResOnFail && res.status(401).json({ authRejected: { errorType: "notLoggedIn", errorMessage: "You must be logged in to view this data" } })
        return false; // No need to clear cookies we know they're not set here
    }

    // Down here implies that user suppiest at least one of: jwtCookie, csrfCookie, or csrfHeader supplied

    // decode token ASAP because we can trust the tokens signed by the server and we can trust the sessionID in there.
    // we want to get the sessionID as early as possible so we can delete the session on auth failure
    let decodedToken;
    if (authJWTCookie) {
        try {
            decodedToken = jwt.verify(authJWTCookie, process.env.JWT_SECRET);
        }
        catch {
            return onAuthFailure(401, "verification", "AUTH_JWT cookie could not be verified")
        }
    }

    // These will all be undefined if authJWTCookie is not set.
    // We can trust the integrity of these values since they are signed in a JWT token by us
    ({ sessionUUID, sessionCSRF } = decodedToken ?? { }); 

    // If we have some pieces of auth info but any are missing, auth fails
    if ((!authJWTCookie || !authCSRFCookie || !authCSRFHeader)) {

        const errors = []

        !authJWTCookie && (errors.push("AUTH_JWT cookie"));
        !authCSRFCookie && (errors.push("AUTH_CSRF cookie"));
        !authCSRFHeader && (errors.push("AUTH_CSRF header"));

        const s = errors.length == 1 ? "" : "s";
        sessionUUID && deleteSessionSoon(sessionUUID);
        return onAuthFailure(401, "incompleteAuth", `Incomplete authentication. Missing ${errors.length} form${s} of authentication: ${errors.join(", ")}`);
    }

    // Down here it is now implied that authJWTCookie, authCSRFCookie, authCSRFHeader are set
    // Implied that sessionUUID and sessionCSRF are set here AND that we can trust their values since they come from the JWT

    // This covers the case where they try to steal your authCSRF cookie but they cannot read its value (since it's cross-site), and 
    // therefore they won't be able to set the right value for authCSRFHeader
    if (authCSRFCookie !== authCSRFHeader) 
        return onAuthFailure(401, "verification", "CSRF_AUTH header is not equivalent to the value of AUTH_CSRF cookie")
    
    // Implied that authCSRFCookie === authCSRFHeader here and below

    // This covers they case where they try to send a random CSRF header and make their own CSRF cookie that matches it.
    // However even though they match, they don't match with the trusted (signed) sessionCSRF stored in the HTTPOnly cookie
    if (sessionCSRF !== authCSRFCookie) 
        return onAuthFailure(401, "verification", "CSRF cookie and CSRF header have been tampered with")

    // Find their session in the database
    let session;
    try { 
        session = await findSession(sessionUUID) 
    }
    catch { 
        return onAuthFailure(500, "database", "Error querying database for session") 
    }

    // Session not found
    if (!session) 
        return onAuthFailure(401, "sessionNotFound", "Could not find session")

    // It is implied that these exist here
    const { clientId, isCanceled, expiresAt } = session;

    // Session manually canceled. Probs remove this tbh and just delete it to cancel it
    if (isCanceled) 
        return onAuthFailure(401, "sessionCanceled", "Session was manually canceled")

    // Session expired
    if (currentTimeSeconds() >= expiresAt) 
        return onAuthFailure(401, "sessionExpired", "Session expired")

    return { clientId, sessionUUID: sessionUUID }

    // Helper function
    function onAuthFailure(status, errorType, errorMessage) {
        deleteCookiesOnFail && res.clearCookie("auth_jwt")
        deleteCookiesOnFail && res.clearCookie("auth_csrf")
        sessionUUID && deleteSessionSoon(sessionUUID)
        sendResOnFail && res.status(status).json({ authRejected: { errorType, errorMessage } })
        return false;
    }
}

// Deletes session in 15 seconds
export function deleteSessionSoon(sessionUUID) {
    setTimeout(async () => {
        try {
            await deleteSession(sessionUUID)
        }
        catch (err) {
            console.log("WARN: call to deleteSession 'deleteSessionSoon' failed", err);
        }
    }, 15 * 1000)
}

// Returns { token, decoded } or false if there was an sql error
export async function createSessionAndSetCookies(client, res) {

    let session;
    try {
        session = await newSession(client.clientId);
    }
    catch (err) {
        return false;
    }

    // Session returns [ token, decodedToken: { sessionUUID, sessionCSRF } ]. We only destructure CSRF out of decodedToken here
    const [token, { sessionCSRF }] = session;

    // Session cookie lasts 3 hours while session in database lasts 15 minutes
    // If cookie exists but session expires they will get "Session Expired" modal
    // If cookie no longer exists they will get "Not Authorized" modal
    // This means:
    // If they come back after 15 mins of their last request, but also within 3 hours of their last request they get "Session Expired modal"
    // If they come back after 3 hours it will simply tell them they aren't logged in
    res.cookie("auth_jwt", token, { httpOnly: true, maxAge: 1000 * 60 * (180) });
    res.cookie("auth_csrf", sessionCSRF, { httpOnly: false, maxAge: 1000 * 60 * (180) });

    return true;
}