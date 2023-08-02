/** Updates and returns reference to the same object */
export function deleteUndefined(obj) {
    for (let key in obj) 
        if (obj[key] === undefined)
            delete obj[key];
    return obj;
}

export const stripTrailingSlash = (str) => str.endsWith('/') ? str.slice(0, -1) : str;

export function formatToUSCurrency(number) {
    number = Number(number);
    if (Number.isNaN(number)) {
        return "NaN";
    }
    const formattedNumber = number.toFixed(2); // Format the number to have 2 decimal places
    return "$" + formattedNumber; // Add the dollar sign ($) prefix
}

export function getCustomerFullName(customer) {
    const { customerFirstName, customerMiddleName, customerLastName } = customer;
    return customerFirstName + (customerMiddleName ? ` ${customerMiddleName}` : "") + ` ${customerLastName}`;
}

// Creates a unique key for a new rich-object for some of our rich-object lists. 
let currKey = 0;
export const getKey = () => currKey++;

/**
 * Converts month, day, year to YYYY-MM-DD
 */
export function convertDateFormat(month, day, year) {
    if (!month || !day || !year)
        return;
    const paddedMonth = String(Number(month) + 1).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
  
    const formattedDate = `${year}-${paddedMonth}-${paddedDay}`;
    return formattedDate;
}

export const stateAbbreviations = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];