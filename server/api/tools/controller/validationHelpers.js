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
