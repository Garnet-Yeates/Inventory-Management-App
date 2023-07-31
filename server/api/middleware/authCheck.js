import jwt from "jsonwebtoken";
import { currentTimeSeconds } from "../../utilities.js";
import { deleteCSRFSession, deleteLoginSession, findCSRFSession, findLoginSession, newSession } from "../tools/database/tblSessionProcedures.js";
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

    const { clientId, loginSessionUUID, csrfSessionUUID } = authCheckResult;

    // Wait 15 seconds before deleting the sessions upon refresh. This solved 2 different race conditions:
    // - Issue with multiple requests being sent at once and the first request deletes the session and invalidates the second request
    // - Issue with axios interceptor being built with a specific csrf cookie but then js-cookie library sets the header for a newer one 
    // See the 'Axios Race Condition Fix' commit for more info (and to see the long detailed comments here that I deleted)
    deleteLoginSessionSoon(loginSessionUUID) 
    deleteCSRFSessionSoon(csrfSessionUUID);

    res.clearCookie("auth_csrf")
    res.clearCookie("auth_jwt")
    console.log("cookies cleared (refresh)")

    // Cookies already gone down here so authRejections do not need to remove them

    let user;
    try {
        user = await getClient({ clientId });
        if (!user) {
            console.log("Error: could not find user associated with clientId")
            return res.status(500).json({ authRejected: { errorType: "noUser", errorMessage: "Could not find user associated with the clientId tied to the session being updated" } })
        }
    }
    catch (err) {
        console.log("Error querying database for user", err)
        return res.status(500).json({ authRejected: { errorType: "database", errorMessage: "Error querying database for user associated with the clientId tied to the session being updated" } })
    }

    if (!await createSessionAndSetCookies(user, res)) {
        console.log("Error: createSessionAndSetCookies failed")
        // Send authFailed here so that our interceptor brings them to the login page and displays error
        return res.status(500).json({ authRejected: { errorType: "database", errorMessage: "Error inserting new session into database upon session refresh" } })
    }

    console.log("auth check done (cookie shldd be back)")
    // Attach user to request
    req.auth = { clientId, loginSessionUUID };

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
 * @param {{sendResOnFail: boolean, deleteCookiesOnFail: boolean }} options 
 * @returns object containing loginSessionUUID, csrfSessionUUID and clientID upon success, or false upon failure
 */
export async function authCheckHelper(req, res, options) {

    const { sendResOnFail, deleteCookiesOnFail } = options;

    // Initialize these before our first call to onAuthFailure since it needs to access them
    let loginSessionUUID, csrfSessionUUID = null;

    const authJWTCookie = req.cookies["auth_jwt"];
    const authCSRFCookie = req.cookies["auth_csrf"];
    const authCSRFHeader = req.headers["auth_csrf"];

    if (!userSuppliedAnyAuth(req)) {
        console.log("user supplied no auth")
        sendResOnFail && res.status(401).json({ authRejected: { errorType: "notLoggedIn", errorMessage: "You must be logged in to view this data" } })
        return false; // No need to clear cookies we know they're not set here
    }

    // Down here implies that user suppied at least one of: jwtCookie, csrfCookie, or csrfHeader

    // decode token ASAP because we can trust the tokens signed by the server and we can trust the loginSessionUUID in there.
    // we want to get the loginSessionUUID as early as possible so we can delete the session on auth failure
    let decodedToken;
    if (authJWTCookie) {
        try {
            decodedToken = jwt.verify(authJWTCookie, process.env.JWT_SECRET);
        }
        catch {
            return await onAuthFailure(401, "verification", "AUTH_JWT cookie could not be verified")
        }
    }

    // Undefined if authJWTCookie is not set. We can trust its value if defined since it is signed by us
    loginSessionUUID = decodedToken?.loginSessionUUID;

    // If we have some pieces of auth info but any are missing, auth fails
    if (!authJWTCookie || !authCSRFCookie || !authCSRFHeader) {

        const errors = []

        !authJWTCookie && (errors.push("AUTH_JWT cookie"));
        !authCSRFCookie && (errors.push("AUTH_CSRF cookie"));
        !authCSRFHeader && (errors.push("AUTH_CSRF header"));

        const s = errors.length == 1 ? "" : "s";
        return await onAuthFailure(401, "incompleteAuth", `Incomplete authentication. Missing ${errors.length} form${s} of authentication: ${errors.join(", ")}`);
    }

    // Down here it is now implied that authJWTCookie, authCSRFCookie, authCSRFHeader are set
    // Implied that loginSessionUUID is set here AND that we can trust its value since it came from our signed token

    // Find their login session in the database

    let loginSession;
    try {
        loginSession = await findLoginSession(loginSessionUUID)
    }
    catch (err) {
        console.log("authCheckHelper: Error querying database for Login Session", err)
        return await onAuthFailure(500, "database", "Error querying database for Login Session")
    }

    // Session not found
    if (!loginSession) {
        return await onAuthFailure(401, "loginSessionNotFound", "Could not find Login Session")
    }

    // It is implied that these exist here
    const { clientId, isCanceled: loginSessionIsCanceled, expiresAt: loginSessionExpiresAt } = loginSession;

    // Login Session expired
    if (currentTimeSeconds() >= loginSessionExpiresAt) {
        return await onAuthFailure(401, "sessionExpired", "Login Session expired")
    }

    // Login Session manually canceled. Probs remove this tbh and just delete it to cancel it
    if (loginSessionIsCanceled) {
        return await onAuthFailure(401, "sessionCanceled", "Session was manually canceled")
    }

    // Find their CSRF session in the database

    // Notice how we search with the header (not cookie). The cookie can be stolen, but this makes it worthless
    // to steal because they have to actually be able to read it. We don't even do any validation with the cookie, we just
    // use the cookie as a means of transporting the sensitive data so the user can then prove that they can read it by sending
    // back the header. In the past we made sure the header being used matched the exact js cookie being used (which also had to
    // match the exact httponly cookie token csrfId as well) We stopped this practice because our axios request interceptor on the client
    // created race conditions where the cookie being sent didn't match the header being sent. The header
    // sometimes updates to a 'newer' cookie value while the interceptor function is being called, but the cookie being used in the
    // request has already been established. It has to do with using a separate library to grab the cookie value inside the interceptor
    // function. And also axios fault for not giving direct access to the request cookies being used for the intercepted request.
    let csrfSession;
    try {
        csrfSession = await findCSRFSession(authCSRFHeader)
    }
    catch (err) {
        console.log("authCheckHelper: Error querying database for CSRF Session", err)
        return await onAuthFailure(500, "database", "Error querying database for CSRF Session")
    }

    if (!csrfSession) {
        return await onAuthFailure(401, "csrfSessionNotFound", "Could not find CSRF Session")
    }

    const { clientId: csrfSessionClientId, expiresAt: csrfSessionExpiresAt } = csrfSession;

    csrfSessionUUID = csrfSession.csrfSessionUUID;

    // CSRF Session expired
    if (currentTimeSeconds() >= csrfSessionExpiresAt) {
        return await onAuthFailure(401, "sessionExpired", "CSRF Session expired")
    }

    if (csrfSessionClientId !== clientId) {
        return await onAuthFailure(401, "verification", "CSRF_AUTH header being used is not for the client that you claim to be")
    }

    return { clientId, loginSessionUUID, csrfSessionUUID }

    // Helper function
    async function onAuthFailure(status, errorType, errorMessage) {

        console.log("AUTH FAILURE:", errorMessage)

        if (deleteCookiesOnFail) {
            res.clearCookie("auth_jwt")
            res.clearCookie("auth_csrf")
            console.log("cookies deleted (fail)")
        }

        if (loginSessionUUID) {
            try {
                await deleteLoginSession(loginSessionUUID)
            }
            catch (err) {
                console.log("onAuthFailure: error deleting login session", err)
            }
        }

        if (csrfSessionUUID) {
            try {
                await deleteCSRFSession(csrfSessionUUID)
            }
            catch (err) {
                console.log("onAuthFailure: error deleting csrf session", err)
            }
        }

        if (sendResOnFail) {
            res.status(status).json({ authRejected: { errorType, errorMessage } })
        }

        return false;
    }
}

/**
 * Deletes Login Session in 15 seconds. Since this is a timeout and will occur after its calling function has terminated,
 * any errors that happen are automatically caught and treated as a warning.
 * @param {} csrfSessionUUID 
 */export function deleteLoginSessionSoon(loginSessionUUID) {
    setTimeout(async () => {
        try {
            await deleteLoginSession(loginSessionUUID)
        }
        catch (err) {
            console.log("WARN: call to deleteLoginSession failed", err);
        }
    }, 5 * 1000)
}

/**
 * Deletes CSRF Session in 15 seconds. Since this is a timeout and will occur after its calling function has terminated,
 * any errors that happen are automatically caught and treated as a warning.
 * @param {} csrfSessionUUID 
 */
export function deleteCSRFSessionSoon(csrfSessionUUID) {
    setTimeout(async () => {
        try {
            await deleteCSRFSession(csrfSessionUUID)
        }
        catch (err) {
            console.log("WARN: call to deleteCSRFSession failed", err);
        }
    }, 5 * 1000)
}

/**
 * Returns false if there was an error
 */
export async function createSessionAndSetCookies(client, res) {

    let session;
    try {
        session = await newSession(client.clientId);
    }
    catch (err) {
        console.log("Error at createSessionAndSetCookies", err);
        return false;
    }

    const [token, csrfSessionUUID] = session;

    // Session cookie lasts 3 hours while session in database lasts 15 minutes
    // If cookie exists but session expires they will get "Session Expired" modal
    // If cookie no longer exists they will get "Not Authorized" modal
    // This means:
    // If they come back after 15 mins of their last request, but also within 3 hours of their last request they get "Session Expired modal"
    // If they come back after 3 hours it will simply tell them they aren't logged in
    res.cookie("auth_jwt", token, { httpOnly: true, maxAge: 1000 * 60 * (180) });
    res.cookie("auth_csrf", csrfSessionUUID, { httpOnly: false, maxAge: 1000 * 60 * (180) });
    console.log("cookie set")

    return true;
}