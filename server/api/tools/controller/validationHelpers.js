export function clearErrJson(errJson) {
    for (let key in errJson)
        if (errJson[key].length == 0)
            delete errJson[key];
    return Object.keys(errJson).length == 0
}

export function hasMaxNDecimalPlaces(number, n) {
    return typeof (n) === "number" && !Number.isNaN(n) && countDecimalPlaces(number) <= n;
}

 /**
  * Get number of digits in a number (ignores decimal point)
  * @param {*} number 
  * @returns the number of figures when the number is converted to an integer
  */
export function numDigits(number) {
    return number.toFixed(0).length;
}

export function countDecimalPlaces(number) {

    if (Number.isInteger(number)) {
        return 0;
    }

    const decimalString = number.toString().split('.')[1];
    if (decimalString) {
        return decimalString.length;
    }

    return 0;
}

const sqlDateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {*} dateString should be formatted like YYYY-MM-DD
 */
export function isDateStringFormat(dateString) {
    return dateString && typeof dateString === "string" && sqlDateRegex.test(dateString)
}

/**
 * @param {*} dateString should be formatted like YYYY-MM-DD
 */
export function getSQLDateStringAsDateObject(dateString) {

    if (!isDateStringFormat(dateString)) {
        return null;
    }

    const [year, month, day] = dateString.split('-');
    return new Date(year, month - 1, day);
}

export function getDateAsSQLString(date) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day}`;
    console.log(formattedDate);
}

export function isValidDateString(dateString) {

    const date = getSQLDateStringAsDateObject(dateString);
    if (!date) {
        return false;
    }
  
    // Check if the date is an invalid date (e.g., "Invalid Date" or NaN)
    if (isNaN(date.getTime())) {
      return false;
    }
  
    // Check if the parsed date components match the input
    const [year, month, day] = dateString.split('-').map(Number);
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
      return false;
    }
    
    return true;
  }
