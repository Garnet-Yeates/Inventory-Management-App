import { getDateAsSQLString } from "../controller/validationHelpers.js";
import { Table, throwIfAnyKeyIsNullish } from "./procedureAbstractions.js";
import { getItemType } from "./tblItemTypeProcedures.js";

export async function createItemInstance(clientId, itemTypeId, datePurchased, dateAdded, quantity, buyPrice = null, sellPrice = null) {

    throwIfAnyKeyIsNullish({ itemTypeId, datePurchased, dateAdded, quantity });

    if (!clientId) {
        throw new Error("clientId must be supplied (createItemInstance procedure)")
    }

    // Make sure that this itemType is for the specified client. 
    const existingItemType = await getItemType(clientId, { itemTypeId })

    if (!existingItemType) {
        throw new Error(`Could not create an item instance for the specified itemTypeId (${itemTypeId}) on the client (${clientId}) because this itemTypeId does not exist (createItemInstance procedure)`)
    }

    // Try to find an existing instance created with the same dates/price points (UC_itemInstance constituents). 
    // If we find any, we update the quantity column for that table entry instead of creating a new one. 
    // If we do not do this we will get a unique constraint error
    const existingWhere = { datePurchased, dateAdded, buyPrice, sellPrice };
    const instance = await getItemInstance(clientId, existingWhere)
    if (instance) {
        const newQuantity = instance.quantity + quantity;
        updateItemInstances(clientId, { quantity: newQuantity }, existingWhere)
    }
    else {
        await Table("ItemInstance")
            .insert({
                itemTypeId,
                datePurchased,
                dateAdded: dateAdded ?? getDateAsSQLString(new Date()),
                quantity,
                buyPrice: buyPrice ?? existingItemType.defaultBuyPrice,
                sellPrice: sellPrice ?? existingItemType.defaultSellPrice,
            })
            .execute();
    }
}

export async function updateItemInstances(clientId, columns, where) {

    throwIfAnyKeyIsNullish(where);
    throwIfAnyKeyIsNullish(columns);

    if (!clientId) {
        throw new Error("clientId must be supplied (updateItemInstances procedure)")
    }

    if (Object.keys(columns).length === 0) {
        throw new Error("At least one column key-value-pair must be supplied in the columns object (updateItemInstances procedure)")
    }

    if (Object.keys(where).length === 0) {
        throw new Error("At least one column key-value-pair must be supplied in the where object (updateItemInstances procedure)")
    }

    await Table("ItemType")
        .update({ ...columns })
        .where({ clientId, ...where })
        .execute();
}

export async function getItemInstance(clientId, where = {}) {

    return getItemInstances(clientId, where)[0];
}

export async function getItemInstances(clientId, where = {}) {

    throwIfAnyKeyIsNullish(where);

    if (!clientId) {
        throw new Error("clientId must be supplied (getAllItemInstances procedure)")
    }

    return await Table("ItemInstance")
        .where({ clientId, ...where })
        .list()
        .execute()
}
