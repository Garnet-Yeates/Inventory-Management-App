import authRoute from "./authRoute.js";

export default function configureRoutes(app) {
    authRoute(app);
    // Don't forget to add more here
}
