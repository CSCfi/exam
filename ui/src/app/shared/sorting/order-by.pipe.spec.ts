// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { OrderByPipe } from './order-by.pipe';

describe('OrderByPipe', () => {
    let pipe: OrderByPipe;

    beforeEach(() => {
        pipe = new OrderByPipe();
    });

    it('should return input unchanged when it has fewer than 2 elements', () => {
        expect(pipe.transform([], 'name')).toEqual([]);
        expect(pipe.transform([{ name: 'a' }], 'name')).toEqual([{ name: 'a' }]);
    });

    it('should sort strings alphabetically (case-insensitive by default)', () => {
        const input = [{ name: 'Banana' }, { name: 'apple' }, { name: 'Cherry' }];
        const result = pipe.transform(input, 'name');
        expect(result.map((i) => i.name)).toEqual(['apple', 'Banana', 'Cherry']);
    });

    it('should sort strings in reverse alphabetical order when reverse is true', () => {
        const input = [{ name: 'apple' }, { name: 'banana' }, { name: 'cherry' }];
        const result = pipe.transform(input, 'name', true);
        expect(result.map((i) => i.name)).toEqual(['cherry', 'banana', 'apple']);
    });

    it('should sort numbers ascending', () => {
        const input = [{ score: 30 }, { score: 10 }, { score: 20 }];
        const result = pipe.transform(input, 'score');
        expect(result.map((i) => i.score)).toEqual([10, 20, 30]);
    });

    it('should sort numbers descending when reverse is true', () => {
        const input = [{ score: 10 }, { score: 30 }, { score: 20 }];
        const result = pipe.transform(input, 'score', true);
        expect(result.map((i) => i.score)).toEqual([30, 20, 10]);
    });

    it('should resolve nested key paths', () => {
        const input = [{ user: { name: 'Charlie' } }, { user: { name: 'Alice' } }, { user: { name: 'Bob' } }];
        const result = pipe.transform(input, 'user.name');
        expect(result.map((i) => i.user.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should sort null values to the end when ascending', () => {
        const input = [{ name: null }, { name: 'apple' }, { name: null }];
        const result = pipe.transform(input, 'name');
        expect(result[2].name).toBe(null);
    });

    it('should sort null values to the front when reverse is true', () => {
        const input = [{ name: 'apple' }, { name: null }, { name: 'banana' }];
        const result = pipe.transform(input, 'name', true);
        expect(result[0].name).toBe(null);
    });

    it('should place numbers before strings in mixed-type comparison', () => {
        const input = [{ val: 'text' as string | number }, { val: 42 }];
        const result = pipe.transform(input, 'val');
        expect(typeof result[0].val).toBe('number');
    });

    it('should not mutate the original array', () => {
        const input = [{ name: 'b' }, { name: 'a' }];
        const original = [...input];
        pipe.transform(input, 'name');
        expect(input).toEqual(original);
    });
});
