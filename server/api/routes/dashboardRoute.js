import { getNavInfo } from "../controllers/dashboardController.js";

const configureDashboardRoute = (app) => {
    app.route('/dashboard/navInfo')
        .get(getNavInfo)
}

export default configureDashboardRoute;