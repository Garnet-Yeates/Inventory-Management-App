import { loggedInCheck, authRequiredTest, login, register, logout } from "../controllers/authController.js"

const configureAuthRoute = (app) => {
    app.route('/auth/register')
        .post(register)
    app.route('/auth/login')
        .post(login)
    app.route('/auth/loggedInCheck')
        .get(loggedInCheck)
    app.route('/auth/logout')
        .get(logout)
    app.route('/auth/test')
        .get(authRequiredTest)
}

export default configureAuthRoute;