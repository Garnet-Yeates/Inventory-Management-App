import configureAuthRoute from "./authRoute.js";
import configureDashboardRoute from "./dashboardRoute.js";
import configureItemRoute from "./itemTypeRoute.js";

const configureRoutes = (app) => {
    configureAuthRoute(app);
    configureItemRoute(app);
    configureDashboardRoute(app);
}

export default configureRoutes;
