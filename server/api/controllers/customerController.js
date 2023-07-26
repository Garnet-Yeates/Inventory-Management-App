import { capitalizeFirstLetter, clearErrJson, getDateAsSQLString } from "../tools/controller/validationHelpers.js";
import { createCustomer, createCustomerAddress, createCustomerContact, getCustomer, getCustomers, updateCustomerAddress, updateCustomerContact } from "../tools/database/tblCustomerProcedures.js";

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
            customerFirstName,
            customerMiddleName,
            customerLastName,
            addresses,
            contacts,
        }
    } = req;

    const errJson = {}

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
            errJson.addressErrors.push(getAddressErrJson(address, isUpdating));
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
            errJson.contactErrors.push(getContactErrJson(contact, isUpdating));
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

    const dateAdded = getDateAsSQLString(new Date());

    if (Object.keys(errJson).length > 0) {
        return res.status(errJson.databaseError ? 500 : 400).json(errJson);
    }

    let customerId;
    try {
        customerId = await createCustomer(clientId, customerFirstName, customerMiddleName, customerLastName, dateAdded);
    }
    catch (err) {
        console.log("Error inserting new Customer into the database", err)
        return res.status(500).json({ databaseError: "Error inserting new Customer into the database" });
    }

    if (addresses || contacts) {

        if (addresses) {
            try {
                for (let customerAddress of addresses) {
                    const { address, zip, town, customerAddressId } = customerAddress;
                    if (isUpdating) {
                        await updateCustomerAddress(customerAddressId, { address, zip, town })
                    }
                    else {
                        await createCustomerAddress(address, zip, town);
                    }
                }
            }
            catch (err) {
                return res.status(500).json({ databaseError: "Error creating customerAddresses for newly created customer" });
            }
        }

        if (contacts) {
            try {
                for (let customerContact of contacts) {
                    const { contactType, contactValue, customerContactId } = customerContact;
                    if (isUpdating) {
                        await updateCustomerContact(customerContactId, { contactType, contactValue })
                    }
                    else {
                        await createCustomerContact(contactType, contactValue);
                    }
                }
            }
            catch (err) {
                return res.status(500).json({ databaseError: "Error creating customerAddresses for newly created customer" });
            }
        }
    }

    return res.status(200).json({ message: "Customer creation successful" });
}

function getAddressErrJson(addressObj, isUpdating) {

    let { address, zip, town } = addressObj;

    // Should only be present (and must be present) when isUpdating is true
    const { customerAddressId, flaggedForDeletion } = addressObj;

    const addressErrJson = {};

    if (isUpdating) {
        if (!customerAddressId) {
            addressErrJson.customerAddressIdError = "customerAddressId must be supplied when updating a customer address"
        }
        if (!flaggedForDeletion) {
            addressErrJson.flaggedForDeletionErrpr = "flaggedForDeletion property must be supplied when updating a customer address"
        }
    }
    else {
        if (customerAddressId) {
            addressErrJson.customerAddressIdError = "customerAddressId must not be supplied when creating a customer address"
        }
        if (flaggedForDeletion) {
            addressErrJson.flaggedForDeletionError = "flaggedForDeletion property must not be supplied when creating a customer address"
        }
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
        addressErrJson.zipError = "This must be a string or number"
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

function getContactErrJson(contactObj, isUpdating) {

    let { contactType, contactValue } = contactObj;

    // Should only be present (and must be present) when isUpdating is true
    const { customerContactId, flaggedForDeletion } = contactObj;

    const contactErrJson = {};

    if (isUpdating) {
        if (!customerContactId) {
            contactErrJson.customerContactIdError = "customerContactId must be supplied when updating a customer contact"
        }
        if (!flaggedForDeletion) {
            contactErrJson.flaggedForDeletionErrpr = "flaggedForDeletion property must be supplied when updating a customer contact"
        }
    }
    else {
        if (customerContactId) {
            contactErrJson.customerContactIdError = "customerContactId must not be supplied when creating a customer contact"
        }
        if (flaggedForDeletion) {
            contactErrJson.flaggedForDeletionError = "flaggedForDeletion property must not be supplied when creating a customer contact"
        }
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
            contactErrJson.contactTypeError = "Contact type must be either 'Email' 'Cell Phone' or 'Home Phone'"
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
        const customer = await getCustomer(clientId, query);

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
        query,
    } = req;

    try {
        const customers = await getCustomers(clientId, query);
        return res.status(200).json({ customers })
    }
    catch (err) {
        console.log("Database error (getCustomers endpoint)", err)
        return res.status(500).json({ databaseError: "Error querying database to retrieve multiple customers for this client" }, err)
    }
}
