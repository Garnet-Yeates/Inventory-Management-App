import { getDateAsSQLString } from "../controller/validationHelpers.js";
import { Table, throwIfAnyKeyIsNullish } from "./driverAbstractions.js";

export async function createCustomer(clientId, customerFirstName, customerMiddleName = null, customerLastName, dateAdded = null) {

    throwIfAnyKeyIsNullish({ customerFirstName, customerLastName });

    if (!clientId) {
        throw new Error("clientId must be supplied (createCustomer procedure)")
    }

    await Table("Customer").insert({
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

export async function updateCustomerAddress(clientId, customerAddressId, columns) {

    throwIfAnyKeyIsNullish(columns);

    if (!clientId) {
        throw new Error("clientId must be supplied (updateCustomerAddress procedure)")
    }

    if (!customerAddressId) {
        throw new Error("customerAddressId must be supplied (updateCustomerAddress procedure)")
    }

    if (Object.keys(columns).length === 0) {
        throw new Error("At least one column key-value-pair must be supplied in the columns object (updateCustomerAddress procedure)")
    }

    await Table("CustomerAddress")
        .update({ ...columns })
        .where({ clientId, customerAddressId })
        .execute();
}

export async function getCustomerAddress(clientId, where = {}) {
    return (await getCustomerAddresses(clientId, where))[0]
}

export async function getCustomerAddresses(clientId, where = {}) {

    throwIfAnyKeyIsNullish(where);

    if (!clientId) {
        throw new Error("clientId must be supplied (getCustomerAddresses procedure)")
    }

    return await Table("CustomerAddress")
        .where({ clientId, ...where })
        .list()
        .execute();
}

