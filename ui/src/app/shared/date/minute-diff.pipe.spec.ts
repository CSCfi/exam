// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DiffInMinutesPipe } from './minute-diff.pipe';

describe('DiffInMinutesPipe', () => {
    let pipe: DiffInMinutesPipe;

    beforeEach(() => {
        pipe = new DiffInMinutesPipe();
    });

    it('should return 0 for equal timestamps', () => {
        const ts = '2024-01-01T10:00:00.000Z';
        expect(pipe.transform(ts, ts)).toBe(0);
    });

    it('should return a positive number when "to" is after "from"', () => {
        expect(pipe.transform('2024-01-01T10:00:00.000Z', '2024-01-01T10:30:00.000Z')).toBe(30);
    });

    it('should return a negative number when "to" is before "from"', () => {
        expect(pipe.transform('2024-01-01T10:30:00.000Z', '2024-01-01T10:00:00.000Z')).toBe(-30);
    });

    it('should round fractional minutes', () => {
        // 90.5 seconds → 1.508… minutes → rounds to 2
        expect(pipe.transform('2024-01-01T10:00:00.000Z', '2024-01-01T10:01:30.500Z')).toBe(2);
    });

    it('should handle a full day difference (1440 minutes)', () => {
        expect(pipe.transform('2024-01-01T00:00:00.000Z', '2024-01-02T00:00:00.000Z')).toBe(1440);
    });
});
