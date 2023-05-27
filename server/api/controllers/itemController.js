
/**
 * `POST` `/item/createItemType` 
 * 
 * ---
 * 
 * Registers a new Item Type to the application. 
 * 
 * ---
 * 
 * `itemCode`: 5-16 characters, required
 * 
 * `itemName`: 3-48 characters, required, unique
 * 
 * `defaultBuyPrice`: decimal (2 places), required
 * 
 * `defaultSellPrice`: decimal (2 places), required
 * 
 * ---
 * 
 * For each user, item types must be unique on `itemCode`, meaning there cannot be multiple items with the same item code.
 * for validation.
 *
 * ---
 * 
 */
export default function createItemType(req, res) {

}