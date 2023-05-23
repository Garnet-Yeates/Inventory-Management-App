import { login, register } from "../controllers/authController.js";

export default function (app) {
    app.route('/auth/register')
        .post(register)
    app.route('/auth/login')
        .get(login)
}