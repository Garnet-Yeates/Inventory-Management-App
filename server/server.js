
import mysql from 'mysql2'
import express, { json, urlencoded } from 'express'
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import configureRoutes from './api/routes/configureRoutes.js';
import authCheck from './api/middleware/authCheck.js';
import createDatabase from './api/tools/database/initializeDatabase.js';

const port = process.env.PORT || 4000;

dotenv.config();

const app = express()

// Set up cors (has to be first or HTTP req's get blocked)
app.use(cors({
    credentials: true,
    origin: [
        `http://localhost:${3000}`,
        `https://localhost:${3000}`
    ]
}));

// Set up JSON body parsing
app.use(json())
app.use(urlencoded({ extended: false }))
app.use(cookieParser())

app.use(authCheck);

// Configure REST API routes
configureRoutes(app);

// Connect to database
const con = mysql.createConnection({
    host: "localhost",
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: "trackit",
});

export const db = createDatabase(con);

app.listen(port, () => {
    console.log("Server is up and running")

})

export default app;