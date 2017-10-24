
// used by import
export function addParse(addStr) {
    if (addStr == "-") return 0;
    else return addStr;
}

// used by search and import
export function axisParse(num) {
    let n = parseInt(num) || 0;
    if (n <= 0) { return 0; }
    else if (n > 180) { return num % 180; }
    else { return n; }
}

// used by import
export function axisStringParse(axisString) {
    if (Number.isInteger(axisString) || (typeof axisString !== 'string')) {
        return axisParse(axisString);
    } else {
        let axisNumStr = axisString.replace(/^\D+/g, '');
        return axisParse(axisNumStr);
    }
}

// used by search and import
export function floatParse(floatNum) {
    return parseFloat(floatNum) || 0;
}

// used by search and import
export function formatFloat(unformattedNumber) {
    return floatParse(unformattedNumber).toFixed(2);
}
