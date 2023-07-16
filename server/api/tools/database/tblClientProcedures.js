import { Table } from "./driverAbstractions.js";
import bcrypt from 'bcrypt';


/**
 * Finds a client by userName or by clientId (which are both unique identifiers). This function will throw
 * an SQL error if one occurs querying the database
 * 
 */
export async function getClient({ userName, clientId }) {

    if (clientId) {
        return Table("Client").where({ clientId }).first().execute();
    }
    else {
        return Table("Client").where({ userIdentifier: userName.toLowerCase() }).first().execute();
    }
}

/**
 * Attempts to create a client with the given companyName, userName, and password. If SQL errors occur
 * (i.e, connection issues, constraint violations) they will be thrown.
 */
export async function createClient(companyName, userName, password) {

    const userIdentifier = userName.toLowerCase();
    const hashPassword = await bcrypt.hash(password, 10)

    return Table("Client").insert({ companyName, userName, userIdentifier, hashPassword }).execute();
}