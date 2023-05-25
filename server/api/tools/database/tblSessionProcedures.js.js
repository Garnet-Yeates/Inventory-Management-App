import { v4 as uuidv4 } from 'uuid'

import jwt from 'jsonwebtoken'
import { minutesFromNow } from '../../../utilities.js';
import { SessionDurationMinutes } from '../../middleware/authCheck.js';
import { db } from '../../../server.js';

export async function findSession(sessionUUID) {

    let sql = `SELECT * FROM TblSession WHERE sessionUUID = '${sessionUUID}'`

    try {
        const [[sessionQueryResult]] = await db.query(sql);
        return sessionQueryResult;
    } catch (err) {
        console.log("Err querying db in findSession()", err)
        return { sqlError: "Error querying database in findSession()" }
    }
}

// Always returns truthy
// Returns { token, decoded } or { sqlError: "..." }
export async function createSession(clientObj) {

    const decoded = { sessionUUID: uuidv4(), sessionCSRF: uuidv4() }
    
    const token = jwt.sign(decoded, process.env.JWT_SECRET)

    let sql = `INSERT INTO TblSession (sessionUUID, clientId, isCanceled, expiresAt) VALUES ('${decoded.sessionUUID}', ${clientObj.clientId}, ${false}, ${minutesFromNow(SessionDurationMinutes)})`
    try {
        await db.query(sql);
        return [ token, decoded ];
    }
    catch (err) {
        console.log("Err inserting to db in createSession()", err)
        return { sqlError: "error inserting session into database" };
    }
}

export async function deleteSession(sessionUUID) {

    let session = await findSession(sessionUUID);
    if (!session) {
        return false;
    }
    else if (session.sqlError) {
        return { sqlError: "Error querying database in findSession() called by deleteSession()" };
    }

    let sql = `DELETE FROM TblSession WHERE sessionUUID = '${sessionUUID}'`

    try {
        await db.query(sql);
        return true;
    } catch (err) {
        console.log("Err querying db in deleteSession()", err)
        return { sqlError: "Error querying database in deleteSession()" }
    }

}
