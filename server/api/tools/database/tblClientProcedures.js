import { db } from "../../../server.js";
import { Table } from "./ProcedureAbstractions.js";

// Returns null (no result), user, or { sqlError: truthy }
export async function findClient({ userName, clientId }) {

    if (clientId) {
        return Table("TblClient").where({ clientId: clientId }).first().execute();
    }
    else {
        return Table("TblClient").where({ userIdentifier: userName.toLowerCase() }).first().execute();
    }
}

export async function createClient(clientName, userName, password) {

    const userIdentifier = userName.toLowerCase();
    const hashPassword = await bcrypt.hash(password, 10)

    return Table("TblClient").insert({ clientName, userName, userIdentifier, hashPassword }).execute();
}