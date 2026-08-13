// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { PageFillPipe } from './page-fill.pipe';

describe('PageFillPipe', () => {
    let pipe: PageFillPipe;

    beforeEach(() => {
        pipe = new PageFillPipe();
    });

    it('should return input unchanged when not on the last page', () => {
        // 25 total, pageSize 10 → 2 full pages. On page 0 (first page), no fill needed.
        const input = [0, 1, 2, 3, 4];
        const result = pipe.transform(input, 25, 0, 10);
        expect(result).toEqual(input);
    });

    it('should append filler items on the last page when items do not fill it', () => {
        // 25 total, pageSize 10 → pages = 2, amount = 3*10-25 = 5.
        // range(0, 5) is inclusive → 6 filler items. 5 real + 6 fillers = 11.
        const input = [20, 21, 22, 23, 24];
        const result = pipe.transform(input, 25, 2, 10);
        expect(result.length).toBe(11);
        expect(result.slice(0, 5)).toEqual(input);
    });

    it('should return input unchanged when total is an exact multiple of pageSize', () => {
        // 20 total, pageSize 10 → pages = 2. Page 2 would be beyond the data, so no fill.
        // pages = floor(20/10) = 2, current === pages (2 === 2) but amount = 3*10 - 20 = 10 which is a full page of fillers.
        // Actually this means: the last real page is page 1 (0-indexed). Page 2 is empty.
        // pages = 2, current = 1 (last real page) → current !== pages → no fill.
        const input = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        const result = pipe.transform(input, 20, 1, 10);
        expect(result).toEqual(input);
    });

    it('should handle pageSize of 5 with 7 total items on last page', () => {
        // 7 total, pageSize 5 → pages = 1, amount = 2*5-7 = 3. range(0, 3) is inclusive → 4 fillers.
        // 2 real items + 4 fillers = 6.
        const input = [5, 6];
        const result = pipe.transform(input, 7, 1, 5);
        expect(result.length).toBe(6);
        expect(result.slice(0, 2)).toEqual([5, 6]);
    });
});
