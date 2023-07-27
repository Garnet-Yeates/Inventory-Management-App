/** Updates and returns reference to the same object */
export function deleteUndefined(obj) {
    for (let key in obj) 
        if (obj[key] === undefined)
            delete obj[key];
    return obj;
}

export function formatToUSCurrency(number) {
    number = Number(number);
    if (Number.isNaN(number)) {
        return "NaN";
    }
    const formattedNumber = number.toFixed(2); // Format the number to have 2 decimal places
    return "$" + formattedNumber; // Add the dollar sign ($) prefix
}