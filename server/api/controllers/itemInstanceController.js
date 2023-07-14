import { clearErrJson, countDecimalPlaces, numDigits as countDigits, getSQLDateStringAsDateObject, isValidDateString, isDateStringFormat, getDateAsSQLString } from "../tools/controller/validationHelpers.js";
import { createItemInstance, getItemInstances, getItemInstance } from "../tools/database/tblItemInstanceProcedures.js";
import { getItemType, getItemTypes, createItemType, updateItemType } from "../tools/database/tblItemTypeProcedures.js";

const itemCodeRegex = /^[a-zA-Z0-9_]+$/

export async function api_createItemInstance(req, res) {

    const {
        clientId,
        body: {
            itemTypeId,
            datePurchased,
            quantity,
            buyPrice,
            sellPrice,
        }
    } = req;

    const errJson = {
        itemTypeIdErrors: [],
        datePurchasedErrors: [],
        quantityErrors: [],
        buyPriceErrors: [],
        sellPriceErrors: [],
        databaseErrors: [],
    }

    const {
        itemTypeIdErrors,
        datePurchasedErrors,
        quantityErrors,
        buyPriceErrors,
        sellPriceErrors,
        databaseErrors,
    } = errJson;

    // Validate itemTypeId. Must be defined integer > 1, not NaN. It must also be the foreign key to an existing itemType owned by the client

    let existingItemType;
    if (itemTypeId === null || itemTypeId === undefined) {
        itemTypeIdErrors.push("This field is required")
    }
    else if (typeof itemTypeId !== "number") {
        itemTypeIdErrors.push("This must be a number")
    }
    else if (!Number.isInteger(itemTypeId) || itemTypeId <= 0) {
        itemTypeIdErrors.push("Item type must be an integer greater than 0")
    }
    else {
        try {
            existingItemType = await getItemType(clientId, { itemTypeId });

            if (!existingItemType) {
                itemTypeIdErrors.push("Could not find an itemType for this client with the specified itemTypeId")
            }
        }
        catch (err) {
            console.log("Database error:", err)
            databaseErrors.push("Error querying database for existing itemType foreign key check", err)
        }
    }

    // Validate datePurchased. Does not need to be defined (defaults to now), but if it is defined it must be:
    // a valid sql date string (YYYY-MM-DD), as well as a valid date

    if (datePurchased) {
        if (!isDateStringFormat(datePurchased)) {
            datePurchasedErrors.push("Invalid date format. Must be YYYY-MM-DD")
        }
        if (!isValidDateString(datePurchased)) {
            datePurchasedErrors.push("Date is formatted properly but it is an invalid date")
        }
    }

    const dateAdded = getDateAsSQLString(new Date());

    // Validate buyPrice. Does not need to be defined (defaults to defaultBuyPrice), but if it is defined it must be:
    // a decimal/integer greater than or equal to 0 with no more than 4 digits and no more than 2 decimal places

    if (buyPrice !== null && buyPrice !== undefined) {

        if (typeof buyPrice !== "number") {
            buyPriceErrors.push("This must be a number")
        }
        else if (Number.isNaN(buyPrice)) {
            buyPriceErrors.push("Can not be NaN")
        }
        else {
            if (buyPrice < 0) {
                buyPriceErrors.push("Can not be negative")
            }
            if (countDecimalPlaces(buyPrice) > 2) {
                buyPriceErrors.push("Can't have more than 2 decimal places")
            }
            if (countDigits(buyPrice) > 4) {
                buyPriceErrors.push("Can't have more than 4 digits")
            }
        }
    }

    // Validate sellPrice. Same validation as buyPrice

    if (sellPrice !== null && sellPrice !== undefined) {
        if (sellPrice === null || sellPrice === undefined) {
            sellPriceErrors.push("This field is required")
        }
        else if (typeof sellPrice !== "number") {
            sellPriceErrors.push("This must be a number")
        }
        else if (Number.isNaN(sellPrice)) {
            sellPriceErrors.push("Can not be NaN")
        }
        else {
            if (sellPrice < 0) {
                sellPriceErrors.push("Can not be negative")
            }
            if (countDecimalPlaces(sellPrice) > 2) {
                sellPriceErrors.push("Can't have more than 2 decimal places")
            }
            if (countDigits(sellPrice) > 4) {
                sellPriceErrors.push("Can't have more than 4 digits")
            }
        }
    }

    // Validate quantity. Must be an integer > 0
    if (quantity === null || quantity === undefined) {
        quantityErrors.push("This field is required")
    }
    else if (typeof quantity !== "number") {
        quantityErrors.push("This must be a number")
    }
    else if (!Number.isInteger(quantity) || quantity <= 0) {
        quantityErrors.push("Item type must be an integer greater than 0")
    }

    // If any errors, return errJson
    if (!clearErrJson(errJson)) {
        return res.status(databaseErrors.length > 0 ? 500 : 400).json(errJson);
    }

    // One final error possibility here
    try {
        await createItemInstance(clientId, itemTypeId, datePurchased, dateAdded, quantity, buyPrice, sellPrice);
    }
    catch (err) {
        return res.status(500).json({ databaseErrors: ["Error inserting new ItemInstance into the database"] });
    }

    return res.status(200).json({ message: "Item Instance creation successful" });
}

/**
 * `GET` `/itemInstance/getItemInstances` 
 * 
 * Finds all item instances on the client, or if an itemTypeId or itemCode is supplied as a query parameter it will 
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export async function api_getItemInstances(req, res) {

    const {
        clientId,
        query: {
            itemTypeId,
            itemCode,
        }
    } = req;

    try {
        if (itemTypeId) {
            return await getItemInstances(clientId, { itemTypeId })
        }
        else if (itemCode) {
            return await getItemInstances(clientId, { itemCode })
        }
        else {
            return await getItemInstances(clientId)
        }
    }
    catch (err) {
        console.log("Database error (getItemInstances endpoint)", err)
        return res.status(500).json({ databaseError: "Error querying database for item instances" });
    }
}