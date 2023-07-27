import { capitalizeFirstLetter, clearErrJson, getDateAsSQLString } from "../tools/controller/validationHelpers.js";
import { createCustomer, createCustomerAddress, createCustomerContact, getCustomer, getCustomerAddress, getCustomerContact, getCustomerFull, getCustomers, getCustomersFull, updateCustomer, updateCustomerAddress, updateCustomerContact } from "../tools/database/tblCustomerProcedures.js";

const customerNameRegex = /^[a-zA-Z]+$/

// Todo create a createOrUpdateCustomer function so that this api method as well as update method can share code

export async function api_createCustomer(req, res) {
    return await createOrUpdateCustomer(req, res);
}

export async function api_updateCustomer(req, res) {
    return await createOrUpdateCustomer(req, res, true);
}

export async function createOrUpdateCustomer(req, res, isUpdating) {

    let {
        auth: {
            clientId,
            sessionUUID
        },
        body: {
            customerId,
            customerFirstName,
            customerMiddleName,
            customerLastName,
            addresses,
            contacts,
        }
    } = req;

    const errJson = {}

    console.log("createOrUpdateCustomer request body:", req.body)

    // customerId validation if we are updating a customer (not creating)
    if (isUpdating) {

        if (!customerId) {
            return res.status(400).json({ customerIdError: "customerId must be supplied for updating customers" })
        }
        else {
            const customerToUpdate = await getCustomer(clientId, { customerId });
            if (!customerToUpdate) {
                return res.status(404).json({ customerIdError: "Could not find a customer with the specified id to update for this client" })
            }
        }
    }
    else {
        if (customerId) {
            return res.status(400).json({ customerIdError: "customerId is auto-generated and must not be supplied when creating customers" })
        }
    }

    // Validate customerFirstName. Required, alphabetical, 3-64 characters. It is automatically put into proper noun format

    if (!customerFirstName) {
        errJson.customerFirstNameError = "This field is required"
    }
    else if (typeof customerFirstName !== "string") {
        errJson.customerFirstNameError = "This must be a string"
    }
    else {
        customerFirstName = capitalizeFirstLetter(customerFirstName.toLowerCase());

        if (!customerNameRegex.test(customerFirstName)) {
            errJson.customerFirstNameError = "Must consist of only letters"
        }

        if (customerFirstName.length < 3 || customerFirstName.length > 32) {
            errJson.customerFirstNameError = "Must be 3-32 characters";
        }
    }

    // Validate customerLastName. Required, alphabetical, 3-64 characters. It is automatically put into proper noun format

    if (!customerLastName) {
        errJson.customerLastNameError = "This field is required"
    }
    else if (typeof customerLastName !== "string") {
        errJson.customerLastNameError = "This must be a string"
    }
    else {
        customerLastName = capitalizeFirstLetter(customerLastName.toLowerCase());

        if (!customerNameRegex.test(customerLastName)) {
            errJson.customerLastNameError = "Must consist of only letters"
        }

        if (customerLastName.length < 3 || customerLastName.length > 32) {
            errJson.customerLastNameError = "Must be 3-32 characters"
        }
    }

    // Validate customerMiddleName. NOT Required, but must be alphabetical, 3-64 characters. It is automatically put into proper noun format

    if (customerMiddleName) {

        if (typeof customerMiddleName !== "string") {
            errJson.customerMiddleNameError = "This must be a string"
        }
        else {
            customerMiddleName = capitalizeFirstLetter(customerMiddleName.toLowerCase());

            if (!customerNameRegex.test(customerMiddleName)) {
                errJson.customerMiddleNameError = "Must consist of only letters"
            }

            if (customerMiddleName.length < 3 || customerMiddleName.length > 32) {
                errJson.customerMiddleNameError = "Must be 3-32 characters"
            }
        }
    }

    // Validate addresses if they supplied any

    if (addresses) {
        if (!addresses instanceof Array) {
            errJson.addressFormatError = "Addresses parameter must be an array"
        }

        errJson.addressErrors = [];
        for (let address of addresses) {
            errJson.addressErrors.push(await getAddressErrJson(address, customerId));
        }

        let anyAddressErrors = false;
        for (let addressError of errJson.addressErrors) {
            if (Object.keys(addressError).length > 0) {
                anyAddressErrors = true;
                break;
            }
        }

        if (!anyAddressErrors) {
            delete errJson.addressErrors;
        }
    }

    // Validate contacts if they supplied any

    if (contacts) {
        if (!contacts instanceof Array) {
            errJson.contactsFormatError = "Contacts parameter must be an array"
        }

        errJson.contactErrors = [];
        for (let contact of contacts) {
            errJson.contactErrors.push(await getContactErrJson(contact, customerId));
        }

        let anyContactErrors = false;
        for (let contactError of errJson.contactErrors) {
            if (Object.keys(contactError).length > 0) {
                anyContactErrors = true;
                break;
            }
        }

        if (!anyContactErrors) {
            delete errJson.contactErrors;
        }
    }

    // If we had any errors with contacts, addresses, or the customer itself we will stop here
    // Going past this return implies everything is ready for db operations, customer/addy/contact ids existences validated etc
    if (Object.keys(errJson).length > 0) {
        return res.status(errJson.databaseError ? 500 : 400).json(errJson);
    }

    try {
        if (isUpdating) {
            await updateCustomer(clientId, customerId, { customerFirstName, customerMiddleName, customerLastName })
        }
        else {
            customerId = await createCustomer(clientId, customerFirstName, customerMiddleName, customerLastName);
        }
    }
    catch (err) {
        console.log("Error inserting new Customer into the database", err)
        return res.status(500).json({ databaseError: "Error inserting new Customer into the database" });
    }

    if (addresses) {
        try {
            for (let customerAddress of addresses) {
                const { address, zip, town, customerAddressId, flaggedForDeletion } = customerAddress;
                if (customerAddressId) {
                    if (flaggedForDeletion) {
                        // TODO delete
                    }
                    else {
                        await updateCustomerAddress(customerAddressId, { address, zip, town })
                    }

                }
                else {
                    await createCustomerAddress(customerId, address, zip, town);
                }
            }
        }
        catch (err) {
            return res.status(500).json({ databaseError: "Error creating or updating customer addresses" });
        }
    }

    if (contacts) {
        try {
            for (let customerContact of contacts) {
                const { contactType, contactValue, customerContactId, flaggedForDeletion } = customerContact;
                if (customerContactId) {
                    if (flaggedForDeletion) {
                        // TODO delete
                    }
                    else {
                        await updateCustomerContact(customerContactId, { contactType, contactValue })
                    }
                }
                else {
                    await createCustomerContact(customerId, contactType, contactValue);
                }
            }
        }
        catch (err) {
            return res.status(500).json({ databaseError: "Error creating or updating customer contacts" });
        }
    }

    return res.status(200).json({ message: "Customer creation successful" });
}

async function getAddressErrJson(addressObj, customerId) {

    if (!(addressObj && (typeof addressObj === "object"))) {
        return { nullAddressError: "Addresses must be non-null objects" }
    }

    let { address, zip, town } = addressObj;

    // Should only be present (and must be present) when isUpdating is true
    const { customerAddressId, flaggedForDeletion } = addressObj;

    const addressErrJson = {};

    // Implies we are editing an existing address
    if (customerAddressId) {
        if (flaggedForDeletion === null || flaggedForDeletion === undefined) {
            addressErrJson.flaggedForDeletionErrpr = "flaggedForDeletion property must be supplied when updating a customer address"
        }
        if (!(await getCustomerAddress(customerId, { customerAddressId }))) {
            addressErrJson.customerAddressIdError = "Could not find a customer address with the specified id to update for this client"
        }
    }
    else {
        if (flaggedForDeletion !== null && flaggedForDeletion !== undefined) {
            addressErrJson.flaggedForDeletionError = "flaggedForDeletion property must not be supplied when creating a customer address"
        }
    }

    // If flaggedForDeletion is true then we don't care about doing any more validation
    if (flaggedForDeletion) {
        return addressErrJson;
    }

    if (!address) {
        addressErrJson.addressError = "This field is required"
    }
    else if (typeof address !== "string") {
        addressErrJson.addressError = "This must be a string"
    }
    else {
        // Add regex later maybe
        if (address.length < 3 || address.length > 64) {
            addressErrJson.addressError = "Must be 3-32 characters"
        }
    }

    if (!zip) {
        addressErrJson.zipError = "This field is required"
    }
    else if (typeof zip !== "string") {
        addressErrJson.zipError = "This must be a string"
    }
    else {
        if (zip.length !== 5) {
            addressErrJson.zipError = "Must be 5 characters"
        }
    }

    if (!town) {
        addressErrJson.townError = "This field is required"
    }
    else if (typeof town !== "string") {
        addressErrJson.townError = "This must be a string"
    }
    else {
        if (town.length < 3 || town.length > 24) {
            addressErrJson.townError = "Must 3-24 characters"
        }
    }

    return addressErrJson;
}

const contactTypes = ["Email", "Cell Phone", "Home Phone"]

async function getContactErrJson(contactObj, customerId) {

    if (!(contactObj && (typeof contactObj === "object"))) {
        return { nullContactError: "Contacts must be non-null objects" }
    }

    let { contactType, contactValue } = contactObj;

    // Should only be present (and must be present) when isUpdating is true
    const { customerContactId, flaggedForDeletion } = contactObj;

    const contactErrJson = {};

    // Implies we are editing an existing contact
    if (customerContactId) {
        if (flaggedForDeletion === null || flaggedForDeletion === undefined) {
            contactErrJson.flaggedForDeletionErrpr = "flaggedForDeletion property must be supplied when updating a customer contact"
        }
        if (!(await getCustomerContact(customerId, { customerContactId }))) {
            contactErrJson.customerContactIdError = "Could not find a customer address with the specified id to update for this client"
        }
    }
    else {
        if (flaggedForDeletion !== null && flaggedForDeletion !== undefined) {
            contactErrJson.flaggedForDeletionError = "flaggedForDeletion property must not be supplied when creating a customer contact"
        }
    }

    // If flaggedForDeletion is true then we don't care about doing any more validation
    if (flaggedForDeletion) {
        return contactErrJson;
    }

    if (!contactType) {
        contactErrJson.contactTypeError = "This field is required"
    }
    else if (typeof contactType !== "string") {
        contactErrJson.contactTypeError = "This must be a string"
    }
    else {
        let isValid = false;
        for (let validType of contactTypes) {
            if (validType.toLowerCase() === contactType.trim().toLowerCase()) {
                contactType = validType;
                isValid = true;
            }
        }

        if (!isValid) {
            contactErrJson.contactTypeError = "Must be either 'Email' 'Cell Phone' or 'Home Phone'"
        }
    }

    if (!contactValue) {
        contactErrJson.contactValueError = "This field is required"
    }
    else if (typeof contactValue !== "string") {
        contactErrJson.contactValueError = "This must be a string"
    }
    else {
        // TODO be more specific with validation. If it is a phone, it should be formatted like that. Same with email
        if (contactValue.length < 3 || contactValue.length > 48) {
            contactErrJson.contactValueError = "Must 3-24 characters"
        }
    }

    return contactErrJson;
}

// Gets one specific customer based on query. Can only query by customerId
export async function api_getCustomer(req, res) {

    console.log("api_getCustomer request body:", req.body)

    const {
        auth: {
            clientId,
            sessionUUID
        },
        query,
    } = req;

    if (!query.customerId) {
        return res.status(400).json({ errorMessage: "customerId is required" })
    }

    if (Object.keys(query).length > 1) {
        return res.status(400).json({ errorMessage: "Only one query parameter may be supplied here" })
    }

    try {
        const customer = await getCustomerFull(clientId, query);

        if (!customer) {
            return res.status(404).json({ customerIdError: "Could not find a customer in the database with the specified customerId for this client" })
        }

        return res.status(200).json({ customer })
    }
    catch (err) {
        console.log("Database error (getCustomer endpoint)", err)
        return res.status(500).json({ databaseError: "Error querying database for customer" });
    }
}

export async function api_getCustomers(req, res) {

    const {
        auth: {
            clientId,
            sessionUUID
        },
    } = req;

    console.log("api_getCustomers request body:", req.body)

    try {
        const customers = await getCustomersFull(clientId);
        return res.status(200).json({ customers, todaysDate: new Date() })
    }
    catch (err) {
        console.log("Database error (getCustomers endpoint)", err)
        return res.status(500).json({ databaseError: "Error querying database to retrieve multiple customers for this client" }, err)
    }
}


