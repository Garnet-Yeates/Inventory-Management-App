import { db } from "../../../server.js";

// Returns null (no result), user, or { sqlError: truthy }
export async function findClient({ userName, clientId }) {

    let sql;
    if (clientId) {
        sql = `SELECT * FROM TblClient WHERE clientId = '${clientId}'`;
    }
    else {
        userName = userName.toLowerCase();
        sql = `SELECT * FROM TblClient WHERE userIdentifier = '${userName}'`;
    }

    try {
        let [[result]] = await db.query(sql);
        return result;
    }
    catch (err) {
        console.log("Err querying db in findClient()", err)
        return { sqlError: "Error querying database in findClient()" }
    }
}

export async function createClient(clientName, userName, password) {

    const userIdentifier = userName.toLowerCase();
    const hashPassword = await bcrypt.hash(password, 10)

    let sql = `INSERT INTO TblClient (clientName, userName, userIdentifier, hashPassword) VALUES ('${clientName}', '${userName}', '${userIdentifier}', '${hashPassword}');`

    try {
        await db.query(sql);
        return true;
    } catch (err) {
        console.log("Error inserting new client into the database in createClient()", err)
        return { sqlError: "Error inserting new client into the database in createClient()"};
    }
}