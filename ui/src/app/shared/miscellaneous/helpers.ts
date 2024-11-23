// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

export const isNumber = (a: unknown): a is number => typeof a === 'number' && !isNaN(a);
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

export const hashString = (s: string) => [...s].map((c) => c.charCodeAt(0)).reduce((a, b) => ((a << 5) - a + b) | 0);
