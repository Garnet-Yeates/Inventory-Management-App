import jwt from "jsonwebtoken";
import { currentTimeSeconds } from "../../utilities.js";
import { deleteSession, findSession } from "../tools/database/tblSessionProcedures.js.js";
import { createSessionAndSetCookies } from "../controllers/authcontroller.js";
import { findClient } from "../tools/database/tblClientProcedures.js";

export default async function authCheck(req, res, next) {

    // Home, register, loggedInCheck, and login are exempt from this
    const exemptEndpoints = ['/', '/auth/register', '/auth/loggedInCheck', '/auth/login', '/auth/logout'];

    if (exemptEndpoints.includes(req.path)) return next();

    // AuthCheck will automatically send error messages and clear cookies
    let authCheckResult = await authCheckHelper(req, res, { sendResOnFail: true, deleteCookiesOnFail: true });

    if (!authCheckResult) {
        return;
    }

    const { clientId, sessionUUID } = authCheckResult;

    // Wait 1 minute before deleting the session upon refresh. This is so that if a chain of auth requests occur all using the 
    // same cookie (i.e, they all send before one of them resolves sets the new cookie in the browser), the other requests
    // cookie isn't invalidated as a result of the deletion of the session that all the cookies were on
    //
    // Realized this concurrency error due to React's 'double-mount' in development mode, but it was a good catch :)
    setTimeout(async () => {
        if (await deleteSession(sessionUUID)?.sqlError) {
            console.log("WARN: Could not delete old session from database upon session refresh")
        }
    }, 1000*60)

    res.clearCookie("auth_csrf")
    res.clearCookie("auth_jwt")

    // Cookies already gone down here so authRejections do not need to remove them

    const user = await findClient({ clientId });
    if (!user) {
        return res.status(500).json({ authRejected: { errorType: "noUser", errorMessage: "Could not find user associated with the clientId tied to the session being updated" } })
    }
    else if (user.sqlError) {
        return res.status(500).json({ authRejected: { errorType: "databse", errorMessage: "Error querying database for user associated with the clientId tied to the session being updated" } })
    }

    if (!await createSessionAndSetCookies(user, res)) {
        // Send authFailed here so that our interceptor brings them to the login page and displays error
        return res.status(500).json({ authRejected: { errorType: "database", errorMessage: "Error inserting new session into database upon session refresh" } })
    }

    // Next middleware if all is good 

    next();
}


// Checks whether there should even be an attempt to authorize the user
// If NONE of the 3 required auth pieces (jwt cookie, csrf cookie, csrf header) are supplied, do not bother
export function shouldAttemptAuth(req) {
 
    const authJWTCookie = req.cookies["auth_jwt"];
    const authCSRFCookie = req.cookies["auth_csrf"];
    const authCSRFHeader = req.headers["auth_csrf"];

    return authJWTCookie || authCSRFCookie || authCSRFHeader;
}

// NOT an api endpoint, rather a helper method
// The ONLY time res should be defined is when we are using this in our authentication middleware. We use this
// in other places too (such as authController.alreadyLoggedInCheck), but with res undefined
// Returns falsy if authCheck failed in any way shape form factor figure
export async function authCheckHelper(req, res, options) {

    const { sendResOnFail, deleteCookiesOnFail } = options;
 
    const authJWTCookie = req.cookies["auth_jwt"];
    const authCSRFCookie = req.cookies["auth_csrf"];
    const authCSRFHeader = req.headers["auth_csrf"];

    if (!shouldAttemptAuth(req)) {
        console.log("cunty")
        sendResOnFail && res.status(400).json({ authRejected: { errorType: "notLoggedIn", errorMessage: "You must be logged in to view this data" } })
        return false; // No need to clear cookies we know they're not set here
    }

    // Down here implies that we have at least jwtCookie, csrfCookie, or csrfHeader supplied
    // If we have some pieces of auth info but any are missing, auth fails
    if ((!authJWTCookie || !authCSRFCookie || !authCSRFHeader)) {

        const errors = []

        !authJWTCookie && (errors.push("AUTH_JWT cookie"));
        !authCSRFCookie && (errors.push("AUTH_CSRF cookie"));
        !authCSRFHeader && (errors.push("AUTH_CSRF header"));

        const s = errors.length == 1 ? "" : "s";
        return clearAuthCookiesWithErrors(400, res, options, "incompleteAuth", `Incomplete authentication. Missing ${errors.length} form${s} of authentication: ${errors.join(", ")}`);        
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(authJWTCookie, process.env.JWT_SECRET);
    }
    catch {
        return clearAuthCookiesWithErrors(401, res, options, "verification", "AUTH_JWT cookie could not be verified")
    }

    const { sessionUUID, sessionCSRF } = decodedToken;

    if (authCSRFCookie !== authCSRFHeader) {
        return clearAuthCookiesWithErrors(401, res, options, "verification", "CSRF_AUTH header is not equivalent to the value of AUTH_CSRF cookie")
    }

    // It is implied that csrfCookie is the same as csrfHeader here
    if (sessionCSRF !== authCSRFCookie) {
        return clearAuthCookiesWithErrors(401, res, options, "verification", "CSRF cookie has been tampered with")
    }

    let session = await findSession(sessionUUID)
    if (!session) {
        return clearAuthCookiesWithErrors(401, res, options, "sessionNotFound", "Could not find session")
    }
    else if (session.sqlError) {
        return clearAuthCookiesWithErrors(500, res, options, "database", "Error querying database for session")
    }

    const { clientId, isCanceled, expiresAt } = session;

    // Session has expired, technically should never happen since cookie expires before the session does
    if (currentTimeSeconds() >= expiresAt) {
        return clearAuthCookiesWithErrors(401, res, options, "sessionExpired", "Session expired")
    }

    if (isCanceled) {
        return clearAuthCookiesWithErrors(401, res, options, "sessionCanceled", "Session was manually canceled")
    }

    return { clientId, sessionUUID }
}

export function clearAuthCookiesWithErrors(status, res, options, errorType, errorMessage) {

    const { sendResOnFail, deleteCookiesOnFail } = options;
    deleteCookiesOnFail && res.clearCookie("auth_jwt")
    deleteCookiesOnFail && res.clearCookie("auth_csrf")
    sendResOnFail && res.status(status).json({ authRejected: { errorType, errorMessage } })
    return false;
}
