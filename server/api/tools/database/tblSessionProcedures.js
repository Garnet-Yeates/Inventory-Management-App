import { v4 as uuidv4 } from 'uuid'

import jwt from 'jsonwebtoken'
import { minutesFromNow } from '../../../utilities.js';
import { db } from '../../../server.js';
import { Table } from './ProcedureAbstractions.js';

export async function findSession(sessionUUID) {

    return Table("TblSession").where({ sessionUUID: sessionUUID }).first().execute();
}

// Always returns truthy
// Returns { token, decoded } or { sqlError: "..." }
export async function createSession(client) {

    const sessionUUID = uuidv4();
    const sessionCSRF = uuidv4();

    const newSession = {
        sessionUUID,
        clientId: client.clientId,
        isCanceled: false,
        expiresAt: minutesFromNow(1)
    }

    const payload = { sessionUUID, sessionCSRF }
    const token = jwt.sign(payload, process.env.JWT_SECRET)

    Table("TblSession").insert(newSession).execute()
    
    return [token, payload];
}

/**
 * Attempts to delete the session from the database that has the same sessionUUID as the provided UUID
 * 
 * @param {number} sessionUUID 
 * @returns `false` if the session was not found 
 * 
 * an object with the `sqlError` property set if there are an error finding or deleting the session
 * 
 * an object with the `success` property set upon success
 */
export async function deleteSession(sessionUUID) {

    return Table("TblSession").removeWhere({ sessionUUID: sessionUUID }).executeSafe();
}

