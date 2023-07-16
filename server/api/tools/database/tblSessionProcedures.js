import { v4 as uuidv4 } from 'uuid'

import jwt from 'jsonwebtoken'
import { minutesFromNow } from '../../../utilities.js';
import { Table } from './driverAbstractions.js';

/**
 * Finds the session with the specified `sessionUUID`
 */
export async function findSession(sessionUUID) {

    return await Table("Session").where({ sessionUUID: sessionUUID }).first().execute();
}

/**
 * 
 * Returns `{ token, decoded }` where token is string representing the encoded JWT token and decoded the payload of the JWT token. The payload an object
 * containing `{ sessionUUID, sessionCSRF }`. This function will throw an SQL error if a SQL error occurs
 */
export async function newSession(clientID) {

    const sessionUUID = uuidv4();
    const sessionCSRF = uuidv4();

    const newSession = {
        sessionUUID,
        clientId: clientID,
        isCanceled: false,
        expiresAt: minutesFromNow(15)
    }

    const payload = { sessionUUID, sessionCSRF }
    const token = jwt.sign(payload, process.env.JWT_SECRET)

    await Table("Session").insert(newSession).execute()
    
    return [token, payload];
}

/**
 * Attempts to delete the session from the database that has the same `sessionUUID` as the provided one. If
 * an SQL error occurs it will be thrown
 *  
 */
export async function deleteSession(sessionUUID) {

    return await Table("Session").removeWhere({ sessionUUID: sessionUUID }).execute();
}