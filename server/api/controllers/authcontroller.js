import bcrypt from 'bcrypt'
import { db } from '../../server.js';

export async function register(req, res) {

    const { clientName, userName, password } = req.body;

    createClient("GWPS", "PumpKing100", "Dangman101!");

    res.status(200).json({message: "You did it!"});
}

export async function findClient(clientIdentifier) {

}

export async function createClient(clientName, userName, password) {

    const userIdentifier = userName.toLowerCase();
    const hashPassword = await bcrypt.hash(password, 10)

    let sql = `INSERT INTO TblClient (clientName, userName, userIdentifier, hashPassword) VALUES ('${clientName}', '${userName}', '${userIdentifier}', '${hashPassword}');`

    return await db.query(sql);
}

export async function login(req, res) {

}

