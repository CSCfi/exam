// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { FilterByPipe } from './filter-by.pipe';

describe('FilterByPipe', () => {
    let pipe: FilterByPipe;

    beforeEach(() => {
        pipe = new FilterByPipe();
    });

    it('should filter items using the provided predicate', () => {
        const items = [1, 2, 3, 4, 5];
        expect(pipe.transform(items, (n) => n % 2 === 0)).toEqual([2, 4]);
    });

    it('should return all items when predicate always returns true', () => {
        const items = ['a', 'b', 'c'];
        expect(pipe.transform(items, () => true)).toEqual(['a', 'b', 'c']);
    });

    it('should return empty array when predicate always returns false', () => {
        const items = [1, 2, 3];
        expect(pipe.transform(items, () => false)).toEqual([]);
    });

    it('should return input as-is when items is null', () => {
        const result = pipe.transform(null as unknown as never[], (x) => !!x);
        expect(result).toBeNull();
    });

    it('should return input as-is when filterFn is null', () => {
        const items = [1, 2, 3];
        const result = pipe.transform(items, null as unknown as (item: number) => boolean);
        expect(result).toEqual(items);
    });

    it('should handle objects with property-based predicates', () => {
        const items = [{ active: true }, { active: false }, { active: true }];
        expect(pipe.transform(items, (i) => i.active)).toEqual([{ active: true }, { active: true }]);
    });
});
