import { api_createItemInstance, api_getItemInstances } from "../controllers/itemInstanceController.js";

const configureItemInstanceRoute = (app) => {
    app.route('/itemInstance/createItemInstance')
        .post(api_createItemInstance)
    app.route('/itemInstance/getItemInstances')
        .get(api_getItemInstances)
}

export default configureItemInstanceRoute;