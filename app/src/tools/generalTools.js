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

export const stateAbbreviations = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];