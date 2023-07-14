import { 
    api_createCustomer, 
    api_updateCustomer, 
    api_createCustomerAddress, 
    api_updateCustomerAddress, 
    api_createCustomerContact, 
    api_updateCustomerContact 
} from "../controllers/customerController.js";

const configureCustomerRoute = (app) => {
    app.route('/customer/createCustomer')
        .post(api_createCustomer)
    app.route('/customer/updateCustomer')
        .put(api_updateCustomer)
    app.route('/customer/createCustomerAddress')
        .get(api_createCustomerAddress)
    app.route('/customer/updateCustomerAddress')
        .put(api_updateCustomerAddress)
    app.route('/customer/createCustomerContact')
        .put(api_createCustomerContact)
    app.route('/customer/updateCustomerContact')
        .put(api_updateCustomerContact)
}

export default configureCustomerRoute;