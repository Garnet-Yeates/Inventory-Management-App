import { api_createItemType, api_updateItemType, api_getItemType, api_getAllItemTypes } from "../controllers/itemTypeController.js";

const configureItemTypeRoute = (app) => {
    app.route('/itemType/createItemType')
        .post(api_createItemType)
    app.route('/itemType/updateItemType')
        .put(api_updateItemType)
    app.route('/itemType/getItemType')
        .get(api_getItemType)
    app.route('/itemType/getAllItemTypes')
        .get(api_getAllItemTypes)
}

export default configureItemTypeRoute;