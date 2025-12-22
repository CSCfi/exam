// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

export const isNumber = (a: unknown): a is number => typeof a === 'number';
export const isObject = (a: unknown): a is Record<string, unknown> => a instanceof Object;
export const isString = (a: unknown): a is string => typeof a === 'string';
export const isBoolean = (a: unknown): a is boolean => a === !!a;
export const debounce = <F extends (...args: unknown[]) => ReturnType<F>>(func: F, waitFor: number) => {
    let timeout: number;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise((resolve) => {
            if (timeout) {
                window.clearTimeout(timeout);
            }
            timeout = window.setTimeout(() => resolve(func(...args)), waitFor);
        });
};
export const groupBy = <T>(xs: T[], fn: (x: T) => string) =>
    xs.map(fn).reduce(
        (acc, x, i) => {
            acc[x] = (acc[x] || []).concat(xs[i]);
            return acc;
        },
        {} as { [k: string]: T[] },
    );

export const updateList = <T>(items: T[], key: keyof T, value: T): T[] => {
    const index = items.findIndex((item) => item[key] === value[key]);
    items.splice(index, 1, value);
    return items;
};
export const deduplicate = <T>(items: T[], key: keyof T) =>
    items.filter((item, i, xs) => xs.findIndex((item2) => item2[key] === item[key]) === i);

export const hashString = (s: string) => [...s].map((c) => c.charCodeAt(0)).reduce((a, b) => ((a << 5) - a + b) | 0, 0);

export const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

/**
 * Comparable primitive types that can be safely compared in sorting operations
 */
type ComparableValue = string | number | boolean | null | undefined;

/**
 * Type guard to check if a value is comparable
 */
const isComparable = (value: unknown): value is ComparableValue => {
    return (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    );
};

export const path = (pathArray: (string | number)[], obj: unknown): ComparableValue => {
    if (!obj || typeof obj !== 'object') {
        return undefined;
    }

    let current: unknown = obj;

    for (const key of pathArray) {
        if (current == null || typeof current !== 'object') {
            return undefined;
        }

        // Handle both object properties and array indices
        if (Array.isArray(current) && typeof key === 'number') {
            current = current[key];
        } else if (typeof current === 'object' && current !== null) {
            current = (current as Record<string | number, unknown>)[key];
        } else {
            return undefined;
        }
    }

    // Return only comparable primitive types, convert objects/arrays to undefined
    return isComparable(current) ? current : undefined;
};

export const countBy = <T>(xs: T[], fn: (x: T) => string) =>
    xs.map(fn).reduce(
        (acc, x) => {
            acc[x] = (acc[x] || 0) + 1;
            return acc;
        },
        {} as { [k: string]: number },
    );

/**
 * Deep merge two objects, with properties from the right object taking precedence.
 * Equivalent to Ramda's mergeDeepRight function.
 *
 * @param left - The left object (lower precedence)
 * @param right - The right object (higher precedence)
 * @returns A new object with deep-merged properties
 *
 * @example
 * const obj1 = { a: 1, b: { x: 1, y: 2 }, c: 3 };
 * const obj2 = { b: { y: 3, z: 4 }, d: 5 };
 * mergeDeepRight(obj1, obj2);
 * // Result: { a: 1, b: { x: 1, y: 3, z: 4 }, c: 3, d: 5 }
 */
export const mergeDeepRight = <T extends object, U extends object>(left: T, right: U): T & U => {
    if (!isObject(left) || !isObject(right)) {
        return right as T & U;
    }

    const result = { ...left } as Record<string, unknown>;

    for (const key of Object.keys(right)) {
        const leftValue = left[key as keyof T];
        const rightValue = right[key as keyof U];

        if (isObject(leftValue) && isObject(rightValue) && !Array.isArray(leftValue) && !Array.isArray(rightValue)) {
            result[key] = mergeDeepRight(leftValue as Record<string, unknown>, rightValue as Record<string, unknown>);
        } else {
            result[key] = rightValue;
        }
    }

    return result as T & U;
};
