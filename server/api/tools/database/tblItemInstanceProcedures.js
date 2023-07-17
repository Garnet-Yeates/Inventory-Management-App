import { getDateAsSQLString } from "../controller/validationHelpers.js";
import { Table, throwIfAnyKeyIsNullish } from "./driverAbstractions.js";
import { getItemType } from "./tblItemTypeProcedures.js";

export async function createItemInstance(clientId, itemTypeId, datePurchased = null, dateAdded = null, quantity, buyPrice = null, sellPrice = null) {

    throwIfAnyKeyIsNullish({ itemTypeId, datePurchased, quantity });

    if (!clientId) {
        throw new Error("clientId must be supplied (createItemInstance procedure)")
    }

    // Make sure that this itemType is for the specified client. 
    const existingItemType = await getItemType(clientId, { itemTypeId })
    console.log("existing type", existingItemType)

    if (!existingItemType) {
        throw new Error(`Could not create an item instance for the specified itemTypeId (${itemTypeId}) on the client (${clientId}) because this itemTypeId does not exist (createItemInstance procedure)`)
    }

    dateAdded ??= getDateAsSQLString(new Date())
    datePurchased ??= getDateAsSQLString(new Date())
    buyPrice ??= existingItemType.defaultBuyPrice
    sellPrice ??= existingItemType.defaultSellPrice

    // Try to find an existing instance created with the same dates/price points (UC_itemInstance constituents). 
    // If we find any, we update the quantity column for that table entry instead of creating a new one. 
    // If we do not do this we will get a unique constraint error
    const where = { itemTypeId, datePurchased, dateAdded, buyPrice, sellPrice };
    const instance = await getItemInstance(clientId, where)
    if (instance) {
        const newQuantity = instance.quantity + quantity;
        await updateItemInstances({ quantity: newQuantity }, where)
    }
    else {
        await Table("ItemInstance")
            .insert({
                itemTypeId,
                datePurchased,
                dateAdded,
                quantity,
                buyPrice,
                sellPrice,
            })
            .execute();
    }
}

export async function updateItemInstances(columns, where) {

    throwIfAnyKeyIsNullish(where);
    throwIfAnyKeyIsNullish(columns);

    if (Object.keys(columns).length === 0) {
        throw new Error("At least one column key-value-pair must be supplied in the columns object (updateItemInstances procedure)")
    }

    if (Object.keys(where).length === 0) {
        throw new Error("At least one column key-value-pair must be supplied in the where object (updateItemInstances procedure)")
    }

    await Table("ItemInstance")
        .update({ ...columns })
        .where(where)
        .execute();
}

export async function getItemInstance(clientId, where = {}) {

    return (await getItemInstances(clientId, where))[0];
}

export async function getItemInstances(clientId, where = {}) {

    throwIfAnyKeyIsNullish(where);

    // Remove where ambiguity as a result of the join call (ItemType and ItemInstance both have an itemTypeId column so we make it explicit). Maybe add leftWhere and rightWhere in the future
    if (where["itemTypeId"]) {
        where["ItemInstance.itemTypeId"] = where["itemTypeId"];
        delete where["itemTypeId"];
    }

    return await Table("ItemInstance")
        .join("ItemType", { "ItemTypeId": "ItemTypeId" })
        .where({ clientId, ...where })
        .list()
        .execute()
}
