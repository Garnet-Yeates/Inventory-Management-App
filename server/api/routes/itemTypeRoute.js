import { createItemType } from "../controllers/itemTypeController.js";

const configureItemRoute = (app) => {
    app.route('/itemType/createItemType')
        .post(createItemType)
}

export default configureItemRoute;