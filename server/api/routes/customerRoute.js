import { 
    api_createCustomer, 
    api_updateCustomer, 
    api_getCustomers,
    api_getCustomer,
} from "../controllers/customerController.js";

const configureCustomerRoute = (app) => {
    app.route('/customer/createCustomer')
        .post(api_createCustomer)
    app.route('/customer/updateCustomer')
        .put(api_updateCustomer)
    app.route('/customer/getCustomer')
        .get(api_getCustomer)
    app.route('/customer/getCustomers')
        .put(api_getCustomers)
}

export default configureCustomerRoute;