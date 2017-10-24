
// used by search and import
export function roundEquiv(unrounded) {
    if (unrounded < 0) { return -1*(Math.round((-1*unrounded) * 4) / 4); }
    else { return (Math.round(unrounded * 4) / 4); }
}

// used by search and import
export function sphericalEquiv(cylinder, sphere) {
    return ((cylinder * 0.5) + sphere);
}