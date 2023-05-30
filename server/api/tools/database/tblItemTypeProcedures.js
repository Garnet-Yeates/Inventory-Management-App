export async function newItemType(clientId, itemName, itemCode, itemDescription, defaultBuyPrice, defaultSellPrice) {

    Table("ItemType").insert({ 
        clientId, 
        itemName, 
        itemCode, 
        itemCodeIdentifier: itemCode.toLowerCase(), 
        itemDescription, 
        defaultBuyPrice, 
        defaultSellPrice })
}

// Finds an item type by code or id. Code is case-insensitive
export async function findItemType({ itemCode, itemId }) {

    if (itemId) {
        return Table("ItemType").where({ itemId: itemId }).first().execute();
    }
    else {
        return Table("ItemType").where({ itemCodeIdentifier: itemCode.toLowerCase() }).first().execute();
    }
}