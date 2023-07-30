import { v4 as uuidv4 } from 'uuid'

import jwt from 'jsonwebtoken'
import { minutesFromNow } from '../../../utilities.js';
import { Table } from './driverAbstractions.js';

/**
 * Finds the Login Session with the specified `loginSessionUUID`
 */
export async function findLoginSession(loginSessionUUID) {

    return await Table("LoginSession").where({ loginSessionUUID }).first().execute();
}

/**
 * Finds the CSRF Session with the specified `csrfSessionUUID`
 */
export async function findCSRFSession(csrfSessionUUID) {

    return await Table("CSRFSession").where({ csrfSessionUUID }).first().execute();
}

/**
 * Creates a new LoginSession as well as a new CSRFSession for the given client.
 * Returns `[token, csrfUUID]`. `token` should be put into an HTTPOnly cookie and `csrfUUID` should put into a readable cookie.
 * This function will throw an SQL error if it occurs when inserting either the LoginSession or the CSRFSession
 */
export async function newSession(clientID) {

    const loginSessionUUID = uuidv4();
    const csrfSessionUUID = uuidv4();

    const loginSession = {
        loginSessionUUID,
        clientId: clientID,
        isCanceled: false,
        expiresAt: minutesFromNow(15)
    }

    const csrfSession = {
        csrfSessionUUID,
        clientId: clientID,
        expiresAt: minutesFromNow(15)
    }

    const payload = { loginSessionUUID }
    const token = jwt.sign(payload, process.env.JWT_SECRET)

    await Table("LoginSession").insert(loginSession).execute()
    await Table("CSRFSession").insert(csrfSession).execute()
    
    return [token, csrfSessionUUID];
}

/**
 * Attempts to delete the LoginSession from the database that has the same `loginSessionUUID` as the provided one. If
 * an SQL error occurs it will be thrown
 *  
 */
export async function deleteLoginSession(loginSessionUUID) {

    return await Table("LoginSession").removeWhere({ loginSessionUUID }).execute();
}


/**
 * Attempts to delete the CSRFSession from the database that has the same `csrfUUID` as the provided one. If
 * an SQL error occurs it will be thrown
 *  
 */
export async function deleteCSRFSession(csrfSessionUUID) {

    return await Table("CSRFSession").removeWhere({ csrfSessionUUID }).execute();
}