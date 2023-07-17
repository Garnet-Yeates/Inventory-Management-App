import { Table, throwIfAnyKeyIsNullish } from "./driverAbstractions.js";

export async function createItemType(clientId, itemName, itemCode, itemDescription, defaultBuyPrice, defaultSellPrice) {

    throwIfAnyKeyIsNullish({ itemName, itemCode, defaultBuyPrice, defaultSellPrice });

    if (!clientId) {
        throw new Error("clientId must be supplied (createItemType procedure)")
    }

    await Table("ItemType").insert({
        clientId,
        itemName,
        itemCode,
        itemDescription,
        defaultBuyPrice,
        defaultSellPrice
    }).execute();
}

export async function updateItemType(clientId, itemTypeId, columns) {

    throwIfAnyKeyIsNullish(columns);

    if (!clientId) {
        throw new Error("clientId must be supplied (updateItemType procedure)")
    }

    if (!itemTypeId) {
        throw new Error("itemTypeId must be supplied (updateItemType procedure)")
    }

    if (Object.keys(columns).length === 0) {
        throw new Error("At least one column key-value-pair must be supplied in the columns object (updateItemType procedure)")
    }

    await Table("ItemType")
        .update({ ...columns })
        .where({ clientId, itemTypeId, isActive: true })
        .execute();
}

/**
 * Finds the first ItemType for this client that matches the specified where clause (if supplied). 
 * @returns the first found ItemType, or null if it could not find one
 */
export async function getItemType(clientId, where = {}) {

    return (await getItemTypes(clientId, where))[0]
}

/**
 * Finds all ItemTypes for this client that match the specified where clause (if supplied). 
 * @returns a list of ItemTypes, or an empty array if it could not find any
 */
export async function getItemTypes(clientId, where = {}) {

    throwIfAnyKeyIsNullish(where);

    if (!clientId) {
        throw new Error("clientId must be supplied (getItemTypes procedure)")
    }

    return await Table("ItemType")
        .where({ clientId, isActive: true, ...where })
        .list()
        .execute()
}