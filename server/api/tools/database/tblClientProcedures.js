import { Table } from "./procedureAbstractions.js";


/**
 * Finds a client by userName or by clientId (which are both unique identifiers). This function will throw
 * an SQL error if one occurs querying the database
 * 
 */
export async function findClient({ userName, clientId }) {

    if (clientId) {
        return Table("Client").where({ clientId: clientId }).first().execute();
    }
    else {
        return Table("Client").where({ userIdentifier: userName.toLowerCase() }).first().execute();
    }
}

/**
 * Attempts to create a client with the given companyName, userName, and password. If SQL errors occur
 * (i.e, connection issues, constraint violations) they will be thrown.
 */
export async function newClient(companyName, userName, password) {

    const userIdentifier = userName.toLowerCase();
    const hashPassword = await bcrypt.hash(password, 10)

    return Table("Client").insert({ companyName, userName, userIdentifier, hashPassword }).execute();
}