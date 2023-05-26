import { redirectIfAlreadyLoggedIn } from "../middleware/AuthenticationMiddleware"
import "../sass/RegisterPage.scss"

function RegisterPage({}) {
    return (
        <div>Nothing here yet</div>
    )
}

export default redirectIfAlreadyLoggedIn(RegisterPage, "/dashboard");