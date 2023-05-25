import { loggedInCheck, authRequiredTest, login, register } from "../controllers/authcontroller.js"

export default function (app) {
    app.route('/auth/register')
        .post(register)
    app.route('/auth/login')
        .post(login)
    app.route('/auth/loggedInCheck')
        .get(loggedInCheck)
    app.route('/auth/test')
        .get(authRequiredTest)
}