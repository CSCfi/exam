// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    countBy,
    deduplicate,
    groupBy,
    hashString,
    isBoolean,
    isNumber,
    isObject,
    isString,
    mergeDeepRight,
    path,
    range,
    updateList,
} from './helpers';

describe('helpers', () => {
    describe('isNumber', () => {
        it('should return true for numbers', () => {
            expect(isNumber(0)).toBe(true);
            expect(isNumber(42)).toBe(true);
            expect(isNumber(-5)).toBe(true);
            expect(isNumber(3.14)).toBe(true);
            expect(isNumber(NaN)).toBe(false);
            expect(isNumber(Infinity)).toBe(true);
        });

        it('should return false for non-numbers', () => {
            expect(isNumber('42')).toBe(false);
            expect(isNumber(null)).toBe(false);
            expect(isNumber(undefined)).toBe(false);
            expect(isNumber({})).toBe(false);
            expect(isNumber([])).toBe(false);
            expect(isNumber(true)).toBe(false);
        });
    });

    describe('isObject', () => {
        it('should return true for objects', () => {
            expect(isObject({})).toBe(true);
            expect(isObject({ a: 1 })).toBe(true);
            expect(isObject([])).toBe(true);
            expect(isObject(new Date())).toBe(true);
        });

        it('should return false for primitives', () => {
            expect(isObject(null)).toBe(false);
            expect(isObject(undefined)).toBe(false);
            expect(isObject(42)).toBe(false);
            expect(isObject('string')).toBe(false);
            expect(isObject(true)).toBe(false);
        });
    });

    describe('isString', () => {
        it('should return true for strings', () => {
            expect(isString('')).toBe(true);
            expect(isString('hello')).toBe(true);
            expect(isString('123')).toBe(true);
        });

        it('should return false for non-strings', () => {
            expect(isString(123)).toBe(false);
            expect(isString(null)).toBe(false);
            expect(isString(undefined)).toBe(false);
            expect(isString({})).toBe(false);
            expect(isString([])).toBe(false);
        });
    });

    describe('isBoolean', () => {
        it('should return true for booleans', () => {
            expect(isBoolean(true)).toBe(true);
            expect(isBoolean(false)).toBe(true);
        });

        it('should return false for non-booleans', () => {
            expect(isBoolean(1)).toBe(false);
            expect(isBoolean(0)).toBe(false);
            expect(isBoolean('true')).toBe(false);
            expect(isBoolean(null)).toBe(false);
            expect(isBoolean(undefined)).toBe(false);
        });
    });

    describe('groupBy', () => {
        it('should group items by the result of the function', () => {
            const items = [
                { name: 'Alice', age: 25 },
                { name: 'Bob', age: 25 },
                { name: 'Charlie', age: 30 },
            ];

            const result = groupBy(items, (x) => x.age);

            expect(result['25']).toEqual([
                { name: 'Alice', age: 25 },
                { name: 'Bob', age: 25 },
            ]);
            expect(result['30']).toEqual([{ name: 'Charlie', age: 30 }]);
        });

        it('should handle empty arrays', () => {
            const result = groupBy([], (x) => x);
            expect(result).toEqual({});
        });

        it('should convert keys to strings', () => {
            const items = [1, 2, 3];
            const result = groupBy(items, (x) => x > 1);

            expect(result['false']).toEqual([1]);
            expect(result['true']).toEqual([2, 3]);
        });
    });

    describe('updateList', () => {
        it('should update an item in the list', () => {
            const items = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' },
            ];

            const updated = updateList(items, 'id', { id: 2, name: 'Bobby' });

            expect(updated[1]).toEqual({ id: 2, name: 'Bobby' });
            expect(updated.length).toBe(3);
        });

        it('should mutate the original array', () => {
            const items = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
            ];
            const original = items;

            updateList(items, 'id', { id: 1, name: 'Alicia' });

            expect(original[0]).toEqual({ id: 1, name: 'Alicia' });
        });
    });

    describe('deduplicate', () => {
        it('should remove duplicates based on key', () => {
            const items = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 1, name: 'Alice Duplicate' },
                { id: 3, name: 'Charlie' },
            ];

            const result = deduplicate(items, 'id');

            expect(result.length).toBe(3);
            expect(result[0]).toEqual({ id: 1, name: 'Alice' });
            expect(result[1]).toEqual({ id: 2, name: 'Bob' });
            expect(result[2]).toEqual({ id: 3, name: 'Charlie' });
        });

        it('should handle empty arrays', () => {
            const result = deduplicate([], 'id');
            expect(result).toEqual([]);
        });

        it('should keep the first occurrence', () => {
            const items = [
                { id: 1, name: 'First' },
                { id: 1, name: 'Second' },
            ];

            const result = deduplicate(items, 'id');
            expect(result[0].name).toBe('First');
        });
    });

    describe('hashString', () => {
        it('should generate consistent hash for same string', () => {
            const hash1 = hashString('test');
            const hash2 = hashString('test');
            expect(hash1).toBe(hash2);
        });

        it('should generate different hashes for different strings', () => {
            const hash1 = hashString('test1');
            const hash2 = hashString('test2');
            expect(hash1).not.toBe(hash2);
        });

        it('should return a number', () => {
            const hash = hashString('test');
            expect(typeof hash).toBe('number');
        });

        it('should handle empty string', () => {
            const hash = hashString('');
            expect(typeof hash).toBe('number');
        });
    });

    describe('range', () => {
        it('should generate array of numbers from start to end inclusive', () => {
            expect(range(1, 5)).toEqual([1, 2, 3, 4, 5]);
            expect(range(0, 3)).toEqual([0, 1, 2, 3]);
            expect(range(-2, 2)).toEqual([-2, -1, 0, 1, 2]);
        });

        it('should handle single element range', () => {
            expect(range(5, 5)).toEqual([5]);
        });

        it('should handle negative ranges', () => {
            expect(range(-5, -3)).toEqual([-5, -4, -3]);
        });
    });

    describe('path', () => {
        const testObj = {
            user: {
                name: 'Alice',
                age: 25,
                address: {
                    city: 'New York',
                },
            },
            items: [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
            ],
            active: true,
            count: 0,
            nullable: null,
        };

        it('should retrieve nested string property', () => {
            expect(path(['user', 'name'], testObj)).toBe('Alice');
            expect(path(['user', 'address', 'city'], testObj)).toBe('New York');
        });

        it('should retrieve nested number property', () => {
            expect(path(['user', 'age'], testObj)).toBe(25);
            expect(path(['count'], testObj)).toBe(0);
        });

        it('should retrieve nested boolean property', () => {
            expect(path(['active'], testObj)).toBe(true);
        });

        it('should handle array indexing', () => {
            expect(path(['items', 0, 'name'], testObj)).toBe('Item 1');
            expect(path(['items', 1, 'id'], testObj)).toBe(2);
        });

        it('should return undefined for non-existent paths', () => {
            expect(path(['nonexistent'], testObj)).toBeUndefined();
            expect(path(['user', 'nonexistent'], testObj)).toBeUndefined();
            expect(path(['items', 5], testObj)).toBeUndefined();
        });

        it('should return undefined for non-primitive values', () => {
            expect(path(['user'], testObj)).toBeUndefined();
            expect(path(['user', 'address'], testObj)).toBeUndefined();
            expect(path(['items'], testObj)).toBeUndefined();
        });

        it('should handle null values', () => {
            expect(path(['nullable'], testObj)).toBe(null);
        });

        it('should return undefined for invalid input', () => {
            expect(path(['user'], null)).toBeUndefined();
            expect(path(['user'], undefined)).toBeUndefined();
            expect(path(['user'], 42)).toBeUndefined();
            expect(path(['user'], 'string')).toBeUndefined();
        });
    });

    describe('countBy', () => {
        it('should count occurrences based on function result', () => {
            const items = ['apple', 'banana', 'apricot', 'blueberry', 'avocado'];
            const result = countBy(items, (x) => x[0]);

            expect(result['a']).toBe(3);
            expect(result['b']).toBe(2);
        });

        it('should handle empty arrays', () => {
            const result = countBy([], (x) => x);
            expect(result).toEqual({});
        });

        it('should count all unique values', () => {
            const items = [1, 2, 2, 3, 3, 3];
            const result = countBy(items, (x) => String(x));

            expect(result['1']).toBe(1);
            expect(result['2']).toBe(2);
            expect(result['3']).toBe(3);
        });
    });

    describe('mergeDeepRight', () => {
        it('should deep merge two objects', () => {
            const obj1 = { a: 1, b: { x: 1, y: 2 }, c: 3 };
            const obj2 = { b: { y: 3, z: 4 }, d: 5 };

            const result = mergeDeepRight(obj1, obj2);

            expect(result).toEqual({
                a: 1,
                b: { x: 1, y: 3, z: 4 },
                c: 3,
                d: 5,
            });
        });

        it('should give precedence to right object values', () => {
            const obj1 = { a: 1, b: 2 };
            const obj2 = { b: 3, c: 4 };

            const result = mergeDeepRight(obj1, obj2);

            expect(result).toEqual({ a: 1, b: 3, c: 4 });
        });

        it('should handle nested objects', () => {
            const obj1 = {
                user: {
                    name: 'Alice',
                    age: 25,
                    address: { city: 'Old City' },
                },
            };
            const obj2 = {
                user: {
                    age: 26,
                    address: { city: 'New City', country: 'USA' },
                },
            };

            const result = mergeDeepRight(obj1, obj2);

            expect(result).toEqual({
                user: {
                    name: 'Alice',
                    age: 26,
                    address: { city: 'New City', country: 'USA' },
                },
            });
        });

        it('should not mutate original objects', () => {
            const obj1 = { a: { b: 1 } };
            const obj2 = { a: { c: 2 } };

            mergeDeepRight(obj1, obj2);

            expect(obj1).toEqual({ a: { b: 1 } });
            expect(obj2).toEqual({ a: { c: 2 } });
        });

        it('should handle empty objects', () => {
            expect(mergeDeepRight({}, { a: 1 })).toEqual({ a: 1 });
            expect(mergeDeepRight({ a: 1 }, {})).toEqual({ a: 1 });
            expect(mergeDeepRight({}, {})).toEqual({});
        });

        it('should replace arrays instead of merging them', () => {
            const obj1 = { items: [1, 2, 3] };
            const obj2 = { items: [4, 5] };

            const result = mergeDeepRight(obj1, obj2);

            expect(result.items).toEqual([4, 5]);
        });

        it('should replace primitives with objects', () => {
            const obj1 = { value: 42 };
            const obj2 = { value: { nested: 'object' } };

            const result = mergeDeepRight(obj1, obj2) as { value: { nested: string } };

            expect(result.value).toEqual({ nested: 'object' });
        });

        it('should replace objects with primitives', () => {
            const obj1 = { value: { nested: 'object' } };
            const obj2 = { value: 42 };

            const result = mergeDeepRight(obj1, obj2) as { value: number };

            expect(result.value).toBe(42);
        });
    });
});
