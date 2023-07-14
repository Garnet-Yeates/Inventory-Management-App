import configureAuthRoute from "./authRoute.js";
import configureDashboardRoute from "./dashboardRoute.js";
import configureItemTypeRoute from "./itemTypeRoute.js";
import configureItemInstanceRoute from "./itemInstanceRoute.js";
import configureCustomerRoute from "./customerRoute.js";

const configureRoutes = (app) => {
    configureAuthRoute(app);
    configureDashboardRoute(app);
    configureItemTypeRoute(app);
    configureItemInstanceRoute(app);
    configureCustomerRoute(app);
}

export default configureRoutes;
