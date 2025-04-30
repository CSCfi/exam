// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Observable, timer } from 'rxjs';
import { map, take } from 'rxjs/operators';

export const isNumber = (a: unknown): a is number => typeof a === 'number';
export const isObject = (a: unknown): a is Record<string, unknown> => a instanceof Object;
export const isString = (a: unknown): a is string => typeof a === 'string';
export const isBoolean = (a: unknown): a is boolean => a === !!a;
export const debounce = <F extends (...args: unknown[]) => ReturnType<F>>(func: F, waitFor: number) => {
    return (...args: Parameters<F>): Observable<ReturnType<F>> => {
        return timer(waitFor).pipe(
            map(() => func(...args)),
            take(1),
        );
    };
};
export const groupBy = <T, K extends string>(xs: T[], fn: (x: T) => K): Record<K, T[]> =>
    xs.reduce(
        (acc, x) => {
            const key = fn(x);
            acc[key] = (acc[key] || []).concat(x);
            return acc;
        },
        {} as Record<K, T[]>,
    );

export const updateList = <T extends Record<K, unknown>, K extends keyof T>(items: T[], key: K, value: T): T[] => {
    const index = items.findIndex((item) => item[key] === value[key]);
    if (index !== -1) {
        items.splice(index, 1, value);
    }
    return items;
};
export const deduplicate = <T>(items: T[], key: keyof T) =>
    items.filter((item, i, xs) => xs.findIndex((item2) => item2[key] === item[key]) === i);

export const hashString = (s: string) => [...s].map((c) => c.charCodeAt(0)).reduce((a, b) => ((a << 5) - a + b) | 0);
