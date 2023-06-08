import { createItemType } from "../controllers/itemController.js";

const configureItemRoute = (app) => {
    app.route('/item/create')
        .post(createItemType)
}

export default configureItemRoute;