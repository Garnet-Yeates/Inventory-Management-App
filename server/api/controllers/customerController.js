import { capitalizeFirstLetter, clearErrJson, getDateAsSQLString } from "../tools/controller/validationHelpers.js";
import { createCustomer, createCustomerAddress, getCustomer } from "../tools/database/tblCustomerProcedures.js";

const customerNameRegex = /^[a-zA-Z]+$/

// Todo create a createOrUpdateCustomer function so that this api method as well as update method can share code
export async function api_createCustomer(req, res) {

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
            errJson.addressErrors.push(getAddressErrJson(address));
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
            errJson.contactErrors.push(getContactErrJson(contact));
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

    try {
        await createCustomer(clientId, customerFirstName, customerMiddleName, customerLastName, dateAdded);
    }
    catch (err) {
        console.log("Error inserting new Customer into the database", err)
        return res.status(500).json({ databaseError: "Error inserting new Customer into the database" });
    }

    if (addresses || contacts) {

        let createdCustomer;
        try {
            createdCustomer = await getCustomer(clientId, { customerFirstName, customerMiddleName, customerLastName, dateAdded })
        }
        catch (err) {
            return res.status(500).json({ databaseError: "Error performing newly created customer existence check" });
        }
        const customerId = createdCustomer.customerId;

        if (addresses) {
            try {
                for (let customerAddress of addresses) {
                    const { address, zip, town } = customerAddress;
                    await createCustomerAddress(customerId, address, zip, town);
                }
            }
            catch (err) {
                return res.status(500).json({ databaseError: "Error creating customerAddresses for newly created customer" });
            }
        }
    
        if (contacts) {
            try {
                for (let customerAddress of addresses) {
                    const { address, zip, town } = customerAddress;
                    await createCustomerAddress(customerId, address, zip, town);
                }
            }
            catch (err) {
                return res.status(500).json({ databaseError: "Error creating customerAddresses for newly created customer" });
            }
        }
    }

    return res.status(200).json({ message: "Customer creation successful" });
}

export async function api_updateCustomer(req, res) {
    // TODO use shared helper method createOrUpdateCustomer
}

export async function api_createCustomerAddress(req, res) {
    // Probably not needed? Could all be done in api_updateCustomer
}

export async function api_updateCustomerAddress(req, res) {
    // Probably not needed? Could be done in api_updateCustomer
}

function getAddressErrJson(addressObj) {

    let { address, zip, town } = addressObj;

    const addressErrorJson = {};

    if (!address) {
        addressErrorJson.addressError = "This field is required"
    }
    else if (typeof address !== "string") {
        addressErrorJson.addressError = "This must be a string"
    }
    else {
        // Add regex later maybe
        if (address.length < 3 || address.length > 64) {
            addressErrorJson.addressError = "Must be 3-32 characters"
        }
    }

    if (!zip) {
        addressErrorJson.zipError = "This field is required"
    }
    else if (typeof zip !== "string") {
        addressErrorJson.zipError = "This must be a string or number"
    }
    else {
        if (zip.length !== 5) {
            addressErrorJson.zipError = "Must be 5 characters"
        }
    }

    if (!town) {
        addressErrorJson.townError = "This field is required"
    }
    else if (typeof town !== "string") {
        addressErrorJson.townError = "This must be a string"
    }
    else {
        if (town.length < 3 || town.length > 24) {
            addressErrorJson.townError = "Must 3-24 characters"
        }
    }

    return addressErrorJson;
}

export async function api_createCustomerContact(req, res) {
    // Probably not needed? Can all be done in api_updateCustomer
}

const contactTypes = ["Email", "Cell Phone", "Home Phone"]

function getContactErrJson(contactObj) {

    let { contactType, contactValue } = contactObj;

    const contactErrJson = {};

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

export async function api_updateCustomerContact(req, res) {
    // Probably not neeeded? Can all be done in api_updateCustomer
}

