import { countDecimalPlaces, hasMaxNDecimalPlaces as isNumberWithMaxDecimalPlaces, numDigits as countDigits } from "../tools/controller/validationHelpers";
import { newItemType } from "../tools/database/tblItemTypeProcedures";

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
export default async function createItemType(req, res) {

    const { itemCode, itemName, defaultBuyPrice, defaultSellPrice } = req.body;

    const clientId = req.clientId;

    const errJson = {
        itemNameErrors: [],
        itemCodeErrors: [],
        itemDescriptionErrors: [],
        buyPriceErrors: [],
        sellPriceErrors: [],
        databaseErrors: [],
    }

    const { itemNameErrors, itemCodeErrors, itemDescriptionErrors, buyPriceErrors, sellPriceErrors, databaseErrors } = errJson;

    // Validate item name

    if (!itemName) {
        itemNameErrors.push("Item name must be supplied")
    }
    else if (typeof itemName !== "string") {
        itemNameErrors.push("Item name must be a string")
    }
    else {
        if (itemName.length < 3 || itemName.length > 64) {
            itemNameErrors.push("Item name must be between 3 and 64 characters")
        }
        // Possibly add regex later
    }

    // Validate item code

    if (!itemCode) {
        itemCodeErrors.push("Item code must be supplied")
    }
    else if (typeof itemCode !== "string") {
        itemCodeErrors.push("Item code must be a string")
    }
    else {
        if (itemCode.length < 3 || itemCode.length > 24) {
            itemCodeErrors.push("Item code must be between 5 and 32 characters")
        }

        if (!itemCodeRegex.exec(itemCode)) {
            itemCodeErrors.push("Item code must be alphanumeric (underscore is allowed)")
        }

        if (itemCodeErrors.length === 0) {
            let existingItem;
            try {
                existingItem = await findItem({ itemCode });
                if (existingItem) {
                    itemCodeErrors.push("This item code is taken")
                }
            }
            catch (err) {
                databaseErrors.push("Error querying database for unique itemCode check", err)
            }
        }
    }

    // Validate item description if they supplied it

    if (itemDescription) {

        if (typeof itemDescription !== "string") {
            itemDescriptionErrors.push("Item description must be a string")
        }
        else {
            if (itemDescription.length > 512) {
                itemDescriptionErrors.push("Item description must be at most 512 characters")
            }
        }
    }

    // Validate default buy price

    if (typeof defaultBuyPrice !== "number") {
        buyPriceErrors.push("Default buy price must be supplied")
    }
    else if (Number.isNaN(defaultBuyPrice)) {
        buyPriceErrors.push("Default buy price can not be NaN")
    }
    else {
        if (countDecimalPlaces(defaultBuyPrice) > 2) {
            buyPriceErrors.push("Default buy price can not have more than 2 decimal places")
        }

        if (countDigits(defaultBuyPrice) > 4) {
            buyPriceErrors.push("Default buy price can not have more than 4 digits")
        }
    }

    // Validate default sell price

    if (typeof defaultSellPrice !== "number") {
        sellPriceErrors.push("Default sell price must be supplied")
    }
    else if (Number.isNaN(defaultSellPrice)) {
        sellPriceErrors.push("Default sell price can not be NaN")
    }
    else {
        if (countDecimalPlaces(defaultSellPrice) > 2) {
            sellPriceErrors.push("Default sell price can not have more than 2 decimal places")
        }

        if (countDigits(defaultSellPrice) > 4) {
            sellPriceErrors.push("Default sell price can not have more than 4 digits")
        }
    }

    // If any errors, return errJson
    if (!clearErrJson(errJson)) {
        return res.status(databaseErrors ? 500 : 400).json(errJson);
    }

    // One final error possibility here
    try {
        await newItemType(clientId, itemCode, itemName, itemDescription, defaultBuyPrice, defaultSellPrice);
    }
    catch (err) {
        return res.status(500).json({ databaseErrors: ["Error inserting new ItemType into the database"] });
    }

    return res.status(200).json({ message: "Item Type creation successful" });
}