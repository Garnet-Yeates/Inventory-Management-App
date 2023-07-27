import { getDateAsSQLString } from "../controller/validationHelpers.js";
import { Table, throwIfAnyKeyIsNullish } from "./driverAbstractions.js";

export async function createCustomer(clientId, customerFirstName, customerMiddleName = null, customerLastName, dateAdded = null) {

    throwIfAnyKeyIsNullish({ customerFirstName, customerLastName });

    if (!clientId) {
        throw new Error("clientId must be supplied (createCustomer procedure)")
    }

    return await Table("Customer").insert({
        clientId,
        customerFirstName,
        customerMiddleName,
        customerLastName,
        dateAdded: dateAdded ?? getDateAsSQLString(new Date()),
    }).execute();
}

export async function updateCustomer(clientId, customerId, columns) {

    throwIfAnyKeyIsNullish(columns);

    if (!clientId) {
        throw new Error("clientId must be supplied (updateCustomer procedure)")
    }

    if (!customerId) {
        throw new Error("customerId must be supplied (updateCustomer procedure)")
    }

    if (Object.keys(columns).length === 0) {
        throw new Error("At least one column key-value-pair must be supplied in the columns object (updateCustomer procedure)")
    }

    await Table("Customer")
        .update({ ...columns })
        .where({ clientId, customerId })
        .execute();
}

export async function getCustomerFull(clientId, where = {}) {
    return (await getCustomersFull(clientId, where))[0]
}

// Where only applies to the customer, not to addr or cont
export async function getCustomersFull(clientId, where = {}) {

    throwIfAnyKeyIsNullish(where);

    if (!clientId) {
        throw new Error("clientId must be supplied (updateCustomer procedure)")
    }

    const customerList = await getCustomers(clientId, where);

    for (let customer of customerList) {
        const customerId = customer.customerId;
        customer.addresses = await getCustomerAddresses(customerId);
        customer.contacts = await getCustomerContacts(customerId);
    }

    return customerList;
}


/**
 * Finds the first Customer for this client that matches the specified where clause (if supplied). 
 * @returns the first found Customer, or null if it could not find one
 */
export async function getCustomer(clientId, where = {}) {

    return (await getCustomers(clientId, where))[0]
}

/**
 * Finds all Customers for this client that match the specified where clause (if supplied). 
 * @returns a list of Customers, or an empty array if it could not find any
 */
export async function getCustomers(clientId, where = {}) {

    throwIfAnyKeyIsNullish(where);

    if (!clientId) {
        throw new Error("clientId must be supplied (getCustomers procedure)")
    }

    return await Table("Customer")
        .where({ clientId, ...where })
        .list()
        .execute();
}

export async function createCustomerAddress(customerId, address, zip, town) {

    throwIfAnyKeyIsNullish({ customerId, address, zip, town });
    
    await Table("CustomerAddress").insert({
        customerId,
        address,
        zip,
        town,
    }).execute();
}

export async function updateCustomerAddress(customerAddressId, columns) {

    if (Object.keys(columns).length === 0) {
        throw new Error("At least one column key-value-pair must be supplied in the columns object (updateCustomerAddress procedure)")
    }

    throwIfAnyKeyIsNullish(columns);

    if (!customerAddressId) {
        throw new Error("customerAddressId must be supplied (updateCustomerAddress procedure)")
    }

    await Table("CustomerAddress")
        .update({ ...columns })
        .where({ customerAddressId })
        .execute();
}

export async function getCustomerAddress(customerId, where = {}) {
    return (await getCustomerAddresses(customerId, where))[0]
}

export async function getCustomerAddresses(customerId, where = {}) {

    throwIfAnyKeyIsNullish(where);
    
    return await Table("CustomerAddress")
        .where({ customerId, ...where })
        .list()
        .execute();
}

export async function createCustomerContact(customerId, contactType, contactValue ) {

    throwIfAnyKeyIsNullish({ customerId, contactType, contactValue });
    
    await Table("CustomerContact").insert({
        customerId,
        contactType,
        contactValue,
    }).execute();
}

export async function updateCustomerContact(customerContactId, columns) {

    if (Object.keys(columns).length === 0) {
        throw new Error("At least one column key-value-pair must be supplied in the columns object (updateCustomerAddress procedure)")
    }

    throwIfAnyKeyIsNullish(columns);

    if (!customerContactId) {
        throw new Error("customerContactId must be supplied (updateCustomerContact procedure)")
    }

    await Table("CustomerContact")
        .update({ ...columns })
        .where({ customerContactId })
        .execute();
}

export async function getCustomerContact(customerId, where = {}) {
    return (await getCustomerContacts(customerId, where))[0]
}

export async function getCustomerContacts(customerId, where = {}) {

    throwIfAnyKeyIsNullish(where);

    return await Table("CustomerContact")
        .where({ customerId, ...where })
        .list()
        .execute();
}