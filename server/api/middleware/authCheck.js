import jwt from "jsonwebtoken";
import { currentTimeSeconds } from "../../utilities.js";
import { deleteSession, findSession } from "../tools/database/tblSessionProcedures.js.js";
import { createSessionAndSetCookies } from "../controllers/authcontroller.js";
import { findClient } from "../tools/database/tblClientProcedures.js";

export default async function authCheck(req, res, next) {

    // Home, register, loggedInCheck, and login are exempt from this
    const exemptEndpoints = ['/', '/auth/register', '/auth/loggedInCheck', '/auth/login'];

    if (exemptEndpoints.includes(req.path)) return next();

    // AuthCheck will automatically send error messages and clear cookies
    let authCheckResult = await authCheckHelper(req, res);

    if (!authCheckResult) {
        return;
    }

    const { clientId, sessionUUID } = authCheckResult;

    // Refresh session

    if (deleteSession(sessionUUID)?.sqlError) {
        console.log("WARN: Could not delete old session from database upon session refresh")
    }

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


// NOT an api endpoint, rather a helper method
// The ONLY time res should be defined is when we are using this in our authentication middleware. We use this
// in other places too (such as authController.alreadyLoggedInCheck), but with res undefined
export async function authCheckHelper(req, res) {

    const authJWTCookie = req.cookies["auth_jwt"];
    const authCSRFCookie = req.cookies["auth_csrf"];
    const authCSRFHeader = req.headers["auth_csrf"];

    // If we're missing all 3, we're simply not logged in
    if (!authJWTCookie && !authCSRFCookie && !authCSRFHeader) {

        // No need to clear cookies we know they're not set here
        res?.status(400).json({ authRejected: { errorType: "notLoggedIn", errorMessage: "You must be logged in to view this data" } })
        return false;
    }

    // Down here implies that we have at least jwtCookie, csrfCookie, or csrfHeader supplied
    // If we have some pieces of auth info but any are missing, auth fails
    if ((!authJWTCookie || !authCSRFCookie || !authCSRFHeader)) {

        const errors = []

        !authJWTCookie && (errors.push("AUTH_JWT cookie"));
        !authCSRFCookie && (errors.push("AUTH_CSRF cookie"));
        !authCSRFHeader && (errors.push("AUTH_CSRF header"));

        const s = errors.length == 1 ? "" : "s";
        clearAuthCookiesWithErrors(400, res, "incompleteAuth", `Incomplete authentication. Missing ${errors.length} form${s} of authentication: ${errors.join(", ")}`);
        
        return false;
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(authJWTCookie, process.env.JWT_SECRET);
    }
    catch {
        clearAuthCookiesWithErrors(401, res, "verification", "AUTH_JWT cookie could not be verified")
        return false;
    }

    const { sessionUUID, sessionCSRF } = decodedToken;

    if (authCSRFCookie !== authCSRFHeader) {
        clearAuthCookiesWithErrors(401, res, "verification", "CSRF_AUTH header is not equivalent to the value of AUTH_CSRF cookie")
        return false;
    }

    // It is implied that csrfCookie is the same as csrfHeader here
    if (sessionCSRF !== authCSRFCookie) {
        clearAuthCookiesWithErrors(401, res, "verification", "CSRF cookie has been tampered with")
        return false;
    }

    let session = await findSession(sessionUUID)
    if (!session) {
        return clearAuthCookiesWithErrors(401, res, "sessionNotFound", "Could not find session")
    }
    else if (session.sqlError) {
        return clearAuthCookiesWithErrors(500, res, "database", "Error querying database for session")
    }

    const { clientId, isCanceled, expiresAt } = session;

    // Session has expired, technically should never happen since cookie expires before the session does
    if (currentTimeSeconds() >= expiresAt) {
        return clearAuthCookiesWithErrors(401, res, "sessionExpired", "Session expired")
    }

    if (isCanceled) {
        return clearAuthCookiesWithErrors(401, res, "sessionCanceled", "Session was manually canceled")
    }

    return { clientId, sessionUUID }
}

export function clearAuthCookiesWithErrors(status, res, errorType, errorMessage) {

    res?.clearCookie("auth_jwt")
    res?.clearCookie("auth_csrf")
    res?.status(status).json({ authRejected: { errorType, errorMessage } })
    return false;
}
