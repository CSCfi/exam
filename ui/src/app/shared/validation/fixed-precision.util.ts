// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

export const toFixedPrecisionString = (value: number | null | undefined): string | null | undefined => {
    if (value == null) {
        return value;
    }
    const re = /^-?[0-9]+(\.[0-9]{1,2})?$/i;
    if (!value.toString().match(re)) {
        return value.toFixed(2);
    }
    return value.toString();
};

export const toFixedPrecisionNumber = (value: number | null | undefined): number | null | undefined => {
    const fixed = toFixedPrecisionString(value);
    if (fixed == null) {
        return fixed;
    }
    return parseFloat(fixed);
};
