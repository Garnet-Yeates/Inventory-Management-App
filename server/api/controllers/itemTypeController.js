import { clearErrJson, countDecimalPlaces, numDigits as countDigits } from "../tools/controller/validationHelpers.js";
import { getItemType, getItemTypes, createItemType, updateItemType } from "../tools/database/tblItemTypeProcedures.js";

const itemCodeRegex = /^[a-zA-Z0-9_]+$/

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

    const {
        clientId,
        body: {
            itemTypeId,
            itemName,
            itemCode,
            itemDescription,
            defaultBuyPrice,
            defaultSellPrice
        }
    } = req;

    const errJson = {
        itemTypeIdErrors: [],
        itemNameErrors: [],
        itemCodeErrors: [],
        itemDescriptionErrors: [],
        defaultBuyPriceErrors: [],
        defaultSellPriceErrors: [],
        databaseErrors: [],
    }

    const {
        itemTypeIdErrors,
        itemNameErrors,
        itemCodeErrors,
        itemDescriptionErrors,
        defaultBuyPriceErrors,
        defaultSellPriceErrors,
        databaseErrors
    } = errJson;

    // itemTypeId validation if we are updating an item (not creating)
    if (isUpdating) {

        if (!itemTypeId) {
            itemTypeIdErrors.push("itemTypeId must be supplied for updating items")
        }
        else {
            existingItem = await getItemType(clientId, { itemTypeId });
            if (!existingItem) {
                itemTypeIdErrors.push("Could not find item with the specified id for this client")
            }
            // Find item in database
        }
    }

    // Validate item name

    if (!itemName) {
        itemNameErrors.push("This field is required")
    }
    else if (typeof itemName !== "string") {
        itemNameErrors.push("This must be a string")
    }
    else {
        if (itemName.length < 3 || itemName.length > 64) {
            itemNameErrors.push("Must be 3-64 characters")
        }
        // Possibly add regex later
    }

    // Validate item code

    if (!itemCode) {
        itemCodeErrors.push("This field is required")
    }
    else if (typeof itemCode !== "string") {
        itemCodeErrors.push("This must be a string")
    }
    else {
        if (itemCode.length < 3 || itemCode.length > 24) {
            itemCodeErrors.push("Must be 5-32 characters")
        }

        if (!itemCodeRegex.exec(itemCode)) {
            itemCodeErrors.push("Must be alphanumeric (underscore is allowed)")
        }

        if (itemCodeErrors.length === 0) {
            let existingItem;
            try {
                existingItem = await getItemType(clientId, { itemCode });
                if (existingItem && (!isUpdating || existingItem.itemTypeId !== itemTypeId)) {
                    itemCodeErrors.push("Item code is in use")
                }
            }
            catch (err) {
                console.log("Database error:", err)
                databaseErrors.push("Error querying database for unique itemCode check")
            }
        }
    }

    // Validate item description if they supplied it

    if (itemDescription) {

        if (typeof itemDescription !== "string") {
            itemDescriptionErrors.push("This must be a string")
        }
        else {
            if (itemDescription.length > 512) {
                itemDescriptionErrors.push("Must be at most 512 characters")
            }
        }
    }

    // Validate default buy price

    if (defaultBuyPrice === null || defaultBuyPrice === undefined) {
        defaultBuyPriceErrors.push("This field is required")
    }
    else if (typeof defaultBuyPrice !== "number") {
        defaultBuyPriceErrors.push("This must be a number")
    }
    else if (Number.isNaN(defaultBuyPrice)) {
        defaultBuyPriceErrors.push("Can not be NaN")
    }
    else {
        if (defaultBuyPrice < 0) {
            defaultBuyPriceErrors.push("Can not be negative")
        }
        if (countDecimalPlaces(defaultBuyPrice) > 2) {
            defaultBuyPriceErrors.push("Can't have more than 2 decimal places")
        }
        if (countDigits(defaultBuyPrice) > 4) {
            defaultBuyPriceErrors.push("Can't have more than 4 digits")
        }
    }

    // Validate default sell price

    if (defaultSellPrice === null || defaultSellPrice === undefined) {
        defaultSellPriceErrors.push("This field is required")
    }
    else if (typeof defaultSellPrice !== "number") {
        defaultSellPriceErrors.push("This must be a number")
    }
    else if (Number.isNaN(defaultSellPrice)) {
        defaultSellPriceErrors.push("Can not be NaN")
    }
    else {
        if (defaultSellPrice < 0) {
            defaultSellPriceErrors.push("Can not be negative")
        }
        if (countDecimalPlaces(defaultSellPrice) > 2) {
            defaultSellPriceErrors.push("Can't have more than 2 decimal places")
        }
        if (countDigits(defaultSellPrice) > 4) {
            defaultSellPriceErrors.push("Can't have more than 4 digits")
        }
    }

    // If any errors, return errJson
    if (!clearErrJson(errJson)) {
        return res.status(databaseErrors.length > 0 ? 500 : 400).json(errJson);
    }

    // One final error possibility here
    try {
        if (isUpdating) {
            await updateItemType(itemTypeId, clientId, { itemCode, itemName, itemDescription, defaultBuyPrice, defaultSellPrice });
        } 
        else {
            await createItemType(clientId, itemCode, itemName, itemDescription, defaultBuyPrice, defaultSellPrice);
        }
    }
    catch (err) {
        return res.status(500).json({ databaseErrors: ["Error inserting new ItemType into the database"] });
    }

    return res.status(200).json({ message: "Item Type creation successful" });
}

export async function api_getItemType(req, res) {

    const {
        clientId,
        body: {
            itemTypeId,
        }
    } = req;

    try {
        const itemInstance = await getItemType(clientId, { itemTypeId });
        if (!itemInstance) {
            return res.status(404).json({ itemTypeIdError: "Could not find an item in the database with the specified itemTypeId for this client"})
        }

        return res.status(200).json({ itemInstance })
    }
    catch (err) {
        console.log("Database error (getItemType endpoint)", err)
        return res.status(500).json({ databaseError: "Error querying database for item type" });
    }
}

export async function api_getAllItemTypes(req, res) {

    const { clientId } = req;

    try {
        const itemTypes = await getItemTypes(clientId);
        return res.status(200).json({ items: itemTypes })
    }
    catch (err) {
        console.log("Database error (getItemTypes endpoint)", err)
        return res.status(500).json({ databaseError: "Error querying database to retrieve all item types for this client" }, err)
    }
}