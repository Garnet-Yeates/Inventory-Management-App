import { Table } from "./procedureAbstractions.js";

export async function newItemType(clientId, { itemName, itemCode, itemDescription, defaultBuyPrice, defaultSellPrice }) {

    await Table("ItemType").insert({ 
        clientId, 
        itemName, 
        itemCode, 
        itemCodeIdentifier: itemCode.toLowerCase(), 
        itemDescription, 
        defaultBuyPrice, 
        defaultSellPrice }).execute()
}

// Finds an item type by code or id. Code is case-insensitive
export async function findItemType({ itemCode, itemId }) {

    if (itemId) {
        return await Table("ItemType").where({ itemId: itemId }).first().execute();
    }
    else {
        return await Table("ItemType").where({ itemCodeIdentifier: itemCode.toLowerCase() }).first().execute();
    }
}