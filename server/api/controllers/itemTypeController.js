import { clearErrJson, countDecimalPlaces, numDigits as countDigits } from "../tools/controller/validationHelpers.js";
import { getItemType, getItemTypes, createItemType, updateItemType } from "../tools/database/tblItemTypeProcedures.js";

export const itemCodeRegex = /^[a-zA-Z0-9_]+$/

/**
 * `POST` `/item/createItemType` 
 * 
 * ---
 * 
 * Registers a new Item Type to the application. 
 * 
 * ---
 * 
 * `itemCode`: 5-24 characters, required
 * 
 * `itemName`: 3-64 characters, required, unique
 * 
 * `itemDescription`: 0-512 characters
 * 
 * `defaultBuyPrice`: decimal (4 digits max, 2 places max), required
 * 
 * `defaultSellPrice`: decimal (4 digits max, 2 places max), required
 * 
 * ---
 * 
 * `itemCode` must match its regex. It must be alphanumeric with no special characters. Underscores are allowed but spaces are not
 * 
 * For each user, item types must be unique on `itemCode`, meaning users can not have multiple item types with the same itemCode.
 *
 * ---
 * 
 */
export async function api_createItemType(req, res) {
    createOrUpdateItemType(req, res);
}

export async function api_updateItemType(req, res) {
    createOrUpdateItemType(req, res, true);
}

// If itemTypeId is supplied we are updating. All ids are > 0 so we can use simple truthy check
async function createOrUpdateItemType(req, res, isUpdating) {

    let {
        auth: {
            clientId,
            sessionUUID
        },
        body: {
            itemTypeId, // if updating
            itemName,
            itemCode,
            itemDescription,
            defaultBuyPrice,
            defaultSellPrice
        }
    } = req;

    const errJson = {};

    // itemTypeId validation if we are updating an item (not creating)
    if (isUpdating) {

        if (!itemTypeId) {
            return res.status(404).json({ itemTypeIdError: "itemTypeId must be supplied for updating item types" })
        }
        else {
            if (!(await getItemType(clientId, { itemTypeId }))) {
                return res.status(404).json({ itemTypeIdError: "Could not find item with the specified id to update for this client" })
            }
        }
    }
    else {
        if (itemTypeId) {
            return res.status(404).json({ itemTypeIdError: "itemTypeId is auto-generated and must not be supplied when creating new item types" })
        }
    }

    // Validate item name

    if (!itemName) {
        errJson.itemNameError = "This field is required"
    }
    else if (typeof itemName !== "string") {
        errJson.itemNameError = "This must be a string"
    }
    else {
        if (itemName.length < 3 || itemName.length > 64) {
            errJson.itemNameError = "Must be 3-64 characters"
        }
        // Possibly add regex later
    }

    // Validate item code

    if (!itemCode) {
        errJson.itemCodeError = "This field is required"
    }
    else if (typeof itemCode !== "string") {
        errJson.itemCodeError = "This must be a string"
    }
    else if (itemCode.length < 3 || itemCode.length > 24) {
        errJson.itemCodeError = "Must be 5-32 characters"
    }
    else if (!itemCodeRegex.exec(itemCode)) {
        errJson.itemCodeError = "Must be alphanumeric (underscore is allowed)"
    }
    else {
        let otherItem;
        try {
            otherItem = await getItemType(clientId, { itemCode });
            if (otherItem && (!isUpdating || otherItem.itemTypeId !== itemTypeId)) {
                errJson.itemCodeError = "Item code is in use"
            }
        }
        catch (err) {
            console.log("Database error:", err)
            errJson.databaseError = "Error querying database for unique itemCode check"
        }
    }

    // Validate item description if they supplied it

    itemDescription = itemDescription?.trim();
    if (itemDescription) {

        if (typeof itemDescription !== "string") {
            errJson.itemDescriptionError = "This must be a string"
        }
        else {
            if (itemDescription.length > 512) {
                errJson.itemDescriptionError = "Must be at most 512 characters"
            }
        }
    }

    // Validate default buy price

    if (defaultBuyPrice === null || defaultBuyPrice === undefined) {
        errJson.defaultBuyPriceError = "This field is required"
    }
    else if (typeof defaultBuyPrice !== "number") {
        errJson.defaultBuyPriceError = "This must be a number"
    }
    else if (Number.isNaN(defaultBuyPrice)) {
        errJson.defaultBuyPriceError = "Can not be NaN"
    }
    else {
        if (defaultBuyPrice < 0) {
            errJson.defaultBuyPriceError = "Can not be negative"
        }
        if (countDecimalPlaces(defaultBuyPrice) > 2) {
            errJson.defaultBuyPriceError = "Can't have more than 2 decimal places"
        }
        if (countDigits(defaultBuyPrice) > 4) {
            errJson.defaultBuyPriceError = "Can't have more than 4 digits"
        }
    }

    // Validate default sell price

    if (defaultSellPrice === null || defaultSellPrice === undefined) {
        errJson.defaultSellPriceError = "This field is required"
    }
    else if (typeof defaultSellPrice !== "number") {
        errJson.defaultSellPriceError = "This must be a number"
    }
    else if (Number.isNaN(defaultSellPrice)) {
        errJson.defaultSellPriceError = "Can not be NaN"
    }
    else {
        if (defaultSellPrice < 0) {
            errJson.defaultSellPriceError = "Can not be negative"
        }
        if (countDecimalPlaces(defaultSellPrice) > 2) {
            errJson.defaultSellPriceError = "Can't have more than 2 decimal places"
        }
        if (countDigits(defaultSellPrice) > 4) {
            errJson.defaultSellPriceError = "Can't have more than 4 digits"
        }
    }

    // If any errors, return errJson
    if (Object.keys(errJson).length > 0) {
        return res.status(errJson.databaseError ? 500 : 400).json(errJson);
    }

    // One final error possibility here
    try {
        if (isUpdating) {
            await updateItemType(clientId, itemTypeId, { itemCode, itemName, itemDescription, defaultBuyPrice, defaultSellPrice });
        }
        else {
            await createItemType(clientId, itemName, itemCode, itemDescription, defaultBuyPrice, defaultSellPrice);
        }
    }
    catch (err) {
        console.log("err inserting new ItemType into the database", err)
        return res.status(500).json({ databaseError: "Error inserting or updating ItemType into the database" });
    }

    return res.status(200).json({ message: "Item Type operation successful" });
}

// Gets one specific item type based on query. Can only query by itemType or itemCode since they identify a single item
export async function api_getItemType(req, res) {

    const {
        auth: {
            clientId,
            sessionUUID
        },
        query,
    } = req;

    if (!query.itemTypeId && !query.itemCode) {
        return res.status(400).json({ errorMessage: "itemTypeId or itemCode is required" })
    }

    if (Object.keys(query).length > 1) {
        return res.status(400).json({ errorMessage: "Only one query parameter may be supplied here" })
    }

    try {
        const itemType = await getItemType(clientId, query);

        if (!itemType) {
            return res.status(404).json({ itemTypeIdError: "Could not find an item in the database with the specified itemTypeId for this client" })
        }

        return res.status(200).json({ itemType })
    }
    catch (err) {
        console.log("Database error (getItemType endpoint)", err)
        return res.status(500).json({ databaseError: "Error querying database for item type" });
    }
}

export async function api_getItemTypes(req, res) {

    const {
        auth: {
            clientId,
            sessionUUID
        },
        query,
    } = req;

    try {
        const itemTypes = await getItemTypes(clientId, query);
        return res.status(200).json({ itemTypes })
    }
    catch (err) {
        console.log("Database error (getItemTypes endpoint)", err)
        return res.status(500).json({ databaseError: "Error querying database to retrieve multiple item types for this client" }, err)
    }
}