import jwt from "jsonwebtoken";
import { currentTimeSeconds } from "../../utilities.js";
import { deleteSession, findSession } from "../tools/database/tblSessionProcedures.js";
import { createSessionAndSetCookies } from "../controllers/authcontroller.js";
import { findClient } from "../tools/database/tblClientProcedures.js";
import { Table } from "../tools/database/ProcedureAbstractions.js";

export default async function authCheck(req, res, next) {

    // Home, register, loggedInCheck, and login are exempt from this
    const exemptEndpoints = ['/', '/auth/register', '/auth/loggedInCheck', '/auth/login', '/auth/logout'];

    if (exemptEndpoints.includes(req.path)) return next();

    // AuthCheck will automatically send error messages and clear cookies with these options
    // Note that sessions are always deleted on auth fail (if auth fail contained a JWT cookie with a sessionID)
    let authCheckResult = await authCheckHelper(req, res, { sendResOnFail: true, deleteCookiesOnFail: true });

    if (!authCheckResult) {
        return; // Simply return here becasuse we told authCheckHelper to send error responses for us
    }

    const { clientId, sessionUUID } = authCheckResult;

    // Wait 15 seconds before deleting the session upon refresh. This is so that if a chain of auth requests occur all using the 
    // same cookie (i.e, they all send before one of them resolves sets the new cookie in the browser), the other requests
    // cookie isn't invalidated as a result of the deletion of the session that all the cookies were on
    //
    // Realized this concurrency error due to React's 'double-mount' in development mode, but it was a good catch :)
    console.log("REFRSH DEL SESH")
    deleteSessionSoon(sessionUUID)

    res.clearCookie("auth_csrf")
    res.clearCookie("auth_jwt")

    // Cookies already gone down here so authRejections do not need to remove them

    let user;
    try {
        user = await findClient({ clientId });
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
 * @param {{sendResOnFail: any, deleteCookiesOnFail: boolean }} options 
 * @returns object containing SessionUUID and clientID upon success, or false upon failure
 */
export async function authCheckHelper(req, res, options) {

    const { sendResOnFail } = options;

    const authJWTCookie = req.cookies["auth_jwt"];
    const authCSRFCookie = req.cookies["auth_csrf"];
    const authCSRFHeader = req.headers["auth_csrf"];

    if (!userSuppliedAnyAuth(req)) {
        sendResOnFail && res.status(400).json({ authRejected: { errorType: "notLoggedIn", errorMessage: "You must be logged in to view this data" } })
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
            return clearAuthCookiesWithErrors(401, res, options, "verification", "AUTH_JWT cookie could not be verified")
        }
    }

    // These will all be undefined if authJWTCookie is not set. Notice how I use ?? to make sure decodedToken isn't undefined which will cause destructure crash
    const { sessionUUID: signedSessionUUID, sessionCSRF: signedSessionCSRF } = decodedToken ?? { }; 

    // If we have some pieces of auth info but any are missing, auth fails
    if ((!authJWTCookie || !authCSRFCookie || !authCSRFHeader)) {

        const errors = []

        !authJWTCookie && (errors.push("AUTH_JWT cookie"));
        !authCSRFCookie && (errors.push("AUTH_CSRF cookie"));
        !authCSRFHeader && (errors.push("AUTH_CSRF header"));

        const s = errors.length == 1 ? "" : "s";
        signedSessionUUID && deleteSessionSoon(signedSessionUUID);
        return clearAuthCookiesWithErrors(400, res, options, "incompleteAuth", `Incomplete authentication. Missing ${errors.length} form${s} of authentication: ${errors.join(", ")}`);
    }


    if (authCSRFCookie !== authCSRFHeader) {
        deleteSessionSoon(signedSessionUUID)
        return clearAuthCookiesWithErrors(401, res, options, "verification", "CSRF_AUTH header is not equivalent to the value of AUTH_CSRF cookie")
    }

    // It is implied that csrfCookie is the same as csrfHeader here
    if (signedSessionCSRF !== authCSRFCookie) {
        deleteSessionSoon(signedSessionUUID)
        return clearAuthCookiesWithErrors(401, res, options, "verification", "CSRF cookie and CSRF header have been tampered with")
    }

    let session;
    try {
        session = await findSession(signedSessionUUID)
    }
    catch (err) {
        deleteSessionSoon(signedSessionUUID)
        return clearAuthCookiesWithErrors(500, res, options, "database", "Error querying database for session")
    }

    if (!session) {
        deleteSessionSoon(signedSessionUUID)
        return clearAuthCookiesWithErrors(401, res, options, "sessionNotFound", "Could not find session")
    }

    const { clientId, isCanceled, expiresAt } = session;

    // Session has expired, technically should never happen since cookie expires before the session does
    if (currentTimeSeconds() >= expiresAt) {
        deleteSessionSoon(signedSessionUUID)
        return clearAuthCookiesWithErrors(401, res, options, "sessionExpired", "Session expired")
    }

    if (isCanceled) {
        deleteSessionSoon(signedSessionUUID)
        return clearAuthCookiesWithErrors(401, res, options, "sessionCanceled", "Session was manually canceled")
    }

    return { clientId, sessionUUID: signedSessionUUID }
}

// Deletes session in 15 seconds
export function deleteSessionSoon(sessionUUID) {
    setTimeout(async () => {
        if (await deleteSession(sessionUUID).sqlError) {
            console.log("WARN: call to deleteSession 'deleteSessionSoon' failed");
        }
    }, 15 * 1000)
}

/**
 * Helper function for authCheckHelper
 */
export function clearAuthCookiesWithErrors(status, res, options, errorType, errorMessage) {

    const { sendResOnFail, deleteCookiesOnFail } = options;
    deleteCookiesOnFail && res.clearCookie("auth_jwt")
    deleteCookiesOnFail && res.clearCookie("auth_csrf")
    sendResOnFail && res.status(status).json({ authRejected: { errorType, errorMessage } })
    return false;
}
