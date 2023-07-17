import { clearErrJson, countDecimalPlaces, numDigits as countDigits, getSQLDateStringAsDateObject, isValidDateString, isDateStringFormat, getDateAsSQLString } from "../tools/controller/validationHelpers.js";
import { createItemInstance, getItemInstances, getItemInstance, updateItemInstances } from "../tools/database/tblItemInstanceProcedures.js";
import { getItemType, getItemTypes, createItemType, updateItemType } from "../tools/database/tblItemTypeProcedures.js";
import { itemCodeRegex } from "./itemTypeController.js";

export async function api_createItemInstance(req, res) {
    createOrUpdateItemInstance(req, res)
}

export async function api_updateItemInstance(req, res) {
    createOrUpdateItemInstance(req, res, true);
}

async function createOrUpdateItemInstance(req, res, isUpdating) {
    let {
        auth: {
            clientId,
            sessionUUID
        },
        body: {
            itemInstanceId, // if updating
            itemCode, // The item we are creating instance of
            datePurchased,
            quantity,
            buyPrice,
            sellPrice,
        }
    } = req;

    const errJson = {};

    if (isUpdating) {
        if (!itemInstanceId) {
            return res.status(404).json({ itemInstanceIdError: "itemInstanceId must be supplied for updating item instances" })
        }
        else {
            if (!await getItemInstance(clientId, { itemInstanceId })) {
                return res.status(404).json({ itemInstanceIdError: "Could not find item instance with the specified id to update for this client" })
            }
        }
    }

    // Validate itemCode

    let itemTypeId;
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
        try {
            const itemType = await getItemType(clientId, { itemCode })
            if (!itemType) {
                errJson.itemCodeError = "Could not find an itemType for this client with the specified itemCode";
            }
            else {
                itemTypeId = itemType.itemTypeId;
            }
        }
        catch (err) {
            console.log("Database error:", err);
            errJson.databaseError = "Error querying database for existing itemType foreign key check";
        }
    }
    
    // Validate datePurchased. Does not need to be defined (defaults to now), but if it is defined it must be:
    // a valid sql date string (YYYY-MM-DD), as well as a valid date
    if (datePurchased) {
        if (!isDateStringFormat(datePurchased)) {
            errJson.datePurchasedError = "Invalid date format. Must be YYYY-MM-DD";
        }
        else if (!isValidDateString(datePurchased)) {
            errJson.datePurchasedError = "Date does not exist";
        }
    }
    else {
        datePurchased = getDateAsSQLString(new Date())
    }

    const dateAdded = getDateAsSQLString(new Date());

    // Validate buyPrice. Does not need to be defined (defaults to defaultBuyPrice), but if it is defined it must be:
    // a decimal/integer greater than or equal to 0 with no more than 4 digits and no more than 2 decimal places
    if (buyPrice !== null && buyPrice !== undefined) {
        if (typeof buyPrice !== "number") {
            errJson.buyPriceError = "This must be a number";
        }
        else if (Number.isNaN(buyPrice)) {
            errJson.buyPriceError = "Can not be NaN";
        }
        else {
            if (buyPrice < 0) {
                errJson.buyPriceError = "Can not be negative";
            }
            if (countDecimalPlaces(buyPrice) > 2) {
                errJson.buyPriceError = "Can't have more than 2 decimal places";
            }
            if (countDigits(buyPrice) > 4) {
                errJson.buyPriceError = "Can't have more than 4 digits";
            }
        }
    }

    // Validate sellPrice. Same validation as buyPrice
    if (sellPrice !== null && sellPrice !== undefined) {
        if (typeof sellPrice !== "number") {
            errJson.sellPriceError = "This must be a number";
        }
        else if (Number.isNaN(sellPrice)) {
            errJson.sellPriceError = "Can not be NaN";
        }
        else {
            if (sellPrice < 0) {
                errJson.sellPriceError = "Can not be negative";
            }
            if (countDecimalPlaces(sellPrice) > 2) {
                errJson.sellPriceError = "Can't have more than 2 decimal places";
            }
            if (countDigits(sellPrice) > 4) {
                errJson.sellPriceError = "Can't have more than 4 digits";
            }
        }
    }

    // Validate quantity. Must be an integer > 0
    if (quantity === null || quantity === undefined) {
        errJson.quantityError = "This field is required";
    }
    else if (typeof quantity !== "number") {
        errJson.quantityError = "This must be a number";
    }
    else if (!Number.isInteger(quantity) || quantity <= 0) {
        errJson.quantityError = "Must be an integer greater than 0";
    }

    // If any errors, return errJson
    if (Object.keys(errJson).length > 0) {
        return res.status(errJson.databaseError ? 500 : 400).json(errJson);
    }

    // One final error possibility here
    try {
        if (isUpdating) {
            const updateMap = { datePurchased, quantity, buyPrice, sellPrice }
            const where = { itemInstanceId }
            await updateItemInstances(updateMap, where);
        }
        else {
            await createItemInstance(clientId, itemTypeId, datePurchased, dateAdded, quantity, buyPrice, sellPrice);
        }
    }
    catch (err) {
        console.log("Error inserting or updating ItemInstance into the database", err)
        return res.status(500).json({ databaseError: "Error inserting or updating ItemInstance into the database" });
    }

    return res.status(200).json({ message: "Item Instance operation successful" });
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
        auth: {
            clientId,
            sessionUUID
        },
        query: {
            itemTypeId,
            itemCode,
            groupByType,
        }
    } = req;

    try {
        let result;
        if (itemTypeId) {
            result = await getItemInstances(clientId, { itemTypeId })
        }
        else if (itemCode) {
            result = await getItemInstances(clientId, { itemCode })
        }
        else {
            result = await getItemInstances(clientId)
        }

        if (groupByType) {
            const typeMap = {}
            for (let instance of result) {
                const { itemTypeId, itemCode } = instance;
                if (!(itemTypeId in typeMap)) {
                    typeMap[itemTypeId] = { itemTypeId, itemCode, instances: [instance] }
                    continue;
                } 
                typeMap[itemTypeId].instances.push(instance);
            }

            result = []

            // Convert the map to an array
            for (let key in typeMap) {
                result.push(typeMap[key])
            }

            result.sort((groupingA, groupingB) => groupingA.itemTypeId - groupingB.itemTypeId)
        }
        else {
            result.sort((a, b) => a.itemTypeId - b.itemTypeId);
        }

        return res.status(200).json({ itemInstances: result })
    }
    catch (err) {
        console.log("Database error (getItemInstances endpoint)", err)
        return res.status(500).json({ databaseError: "Error querying database for item instances" });
    }
}

export async function api_getItemInstance(req, res) {

    const {
        auth: {
            clientId,
            sessionUUID
        },
        query: {
            itemInstanceId,
        }
    } = req;

    if (!itemInstanceId) {
        return res.status(400).json({ itemInstanceIdError: "This field is required" })
    }

    try {
        const itemInstance = await getItemInstance(clientId, { itemInstanceId });
        if (!itemInstance) {
            return res.status(404).json({ itemInstanceIdError: "Could not find an item in the database with the specified itemInstanceId for this client" })
        }

        return res.status(200).json({ itemInstance })
    }
    catch (err) {
        console.log("Database error (getItemInstance endpoint)", err)
        return res.status(500).json({ databaseError: "Error querying database for item instance" });
    }
}