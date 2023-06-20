import { clearErrJson, countDecimalPlaces, numDigits as countDigits } from "../tools/controller/validationHelpers.js";
import { findItemType, newItemType } from "../tools/database/tblItemTypeProcedures.js";

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
export async function createItemType(req, res) {

    const { itemName, itemCode, itemDescription, defaultBuyPrice, defaultSellPrice } = req.body;

    const clientId = req.clientId;

    console.log("REQ BODY", req.body)

    const errJson = {
        itemNameErrors: [],
        itemCodeErrors: [],
        itemDescriptionErrors: [],
        defaultBuyPriceErrors: [],
        defaultSellPriceErrors: [],
        databaseErrors: [],
    }

    const { itemNameErrors, itemCodeErrors, itemDescriptionErrors, defaultBuyPriceErrors, defaultSellPriceErrors, databaseErrors } = errJson;

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
                existingItem = await findItemType({ itemCode });
                if (existingItem) {
                    itemCodeErrors.push("Item code is in use")
                }
            }
            catch (err) {
                console.log("Database error:", err)
                databaseErrors.push("Error querying database for unique itemCode check", err)
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

    if (defaultBuyPrice === null || defaultBuyPrice === undefined)
        defaultBuyPriceErrors.push("This field is required")
    else if (typeof defaultBuyPrice !== "number")
        defaultBuyPriceErrors.push("This must be a number")
    else if (Number.isNaN(defaultBuyPrice))
        defaultBuyPriceErrors.push("Can not be NaN")
    else {
        if (countDecimalPlaces(defaultBuyPrice) > 2) {
            defaultBuyPriceErrors.push("Can't have more than 2 decimal places")
        }

        if (countDigits(defaultBuyPrice) > 4) {
            defaultBuyPriceErrors.push("Can't have more than 4 digits")
        }
    }

    // Validate default sell price

    if (defaultSellPrice === null || defaultSellPrice === undefined)
        defaultSellPriceErrors.push("This field is required")
    else if (typeof defaultSellPrice !== "number")
        defaultSellPriceErrors.push("This must be a number")
    else if (Number.isNaN(defaultSellPrice)) 
        defaultSellPriceErrors.push("Can not be NaN")
    else {
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
        await newItemType(clientId, itemCode, itemName, itemDescription, defaultBuyPrice, defaultSellPrice);
    }
    catch (err) {
        return res.status(500).json({ databaseErrors: ["Error inserting new ItemType into the database"] });
    }

    return res.status(200).json({ message: "Item Type creation successful" });
}