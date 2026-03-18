// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DiffInDaysPipe } from './day-diff.pipe';

describe('DiffInDaysPipe', () => {
    let pipe: DiffInDaysPipe;

    beforeEach(() => {
        pipe = new DiffInDaysPipe();
    });

    it('should return a span without text-danger for a positive diff', () => {
        const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();
        const result = pipe.transform(future, now);
        expect(result).toContain('<span>');
        expect(result).not.toContain('text-danger');
        expect(result).toContain('3');
    });

    it('should return a span with text-danger for a negative diff', () => {
        const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();
        const result = pipe.transform(past, now);
        expect(result).toContain('text-danger');
        expect(result).toContain('-3');
    });

    it('should use current date when "to" is omitted', () => {
        const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
        const result = pipe.transform(future);
        expect(result).toContain('<span>');
        expect(result).not.toContain('text-danger');
    });

    it('should use Math.floor for fractional days (positive)', () => {
        // Exactly 1.9 days from now → should floor to 1
        const from = new Date(Date.now() + 1.9 * 24 * 60 * 60 * 1000).toISOString();
        const to = new Date().toISOString();
        const result = pipe.transform(from, to);
        expect(result).toContain('>1<');
    });

    it('should use Math.floor for fractional days (negative)', () => {
        // 1.2 days in the past → should floor to -2
        const from = new Date(Date.now() - 1.2 * 24 * 60 * 60 * 1000).toISOString();
        const to = new Date().toISOString();
        const result = pipe.transform(from, to);
        expect(result).toContain('>-2<');
    });
});
