// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { vi, type MockInstance } from 'vitest';
import { ApplyDstPipe } from './apply-dst.pipe';
import { DateTimeService } from './date.service';

describe('ApplyDstPipe', () => {
    let pipe: ApplyDstPipe;
    // The correction itself lives in DateTimeService, so drive the real one and fake only the
    // question it asks about the system zone.
    let isDST: MockInstance<DateTimeService['isDST']>;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()] });
        isDST = vi.spyOn(TestBed.inject(DateTimeService), 'isDST');
        pipe = TestBed.runInInjectionContext(() => new ApplyDstPipe());
    });

    it('should return empty string for undefined input', () => {
        expect(pipe.transform(undefined)).toBe('');
    });

    it('should return empty string for empty string input', () => {
        expect(pipe.transform('')).toBe('');
    });

    it('should subtract one hour when the date is in DST', () => {
        isDST.mockReturnValue(true);
        const input = '2024-07-15T12:00:00.000+03:00';
        const result = pipe.transform(input);
        // Compare as UTC timestamps so the test is timezone-agnostic:
        // Luxon may preserve the original offset or normalize to UTC depending on the system zone.
        expect(new Date(result).getTime()).toBe(new Date(input).getTime() - 60 * 60 * 1000);
    });

    it('should keep the instant intact when the date is not in DST', () => {
        isDST.mockReturnValue(false);
        const input = '2024-01-15T12:00:00.000+02:00';
        const result = pipe.transform(input);
        expect(new Date(result).getTime()).toBe(new Date(input).getTime());
    });

    it('should subtract one hour from epoch millis input when the date is in DST', () => {
        isDST.mockReturnValue(true);
        const input = new Date('2024-07-15T12:00:00.000+03:00').getTime();
        const result = pipe.transform(input);
        expect(new Date(result).getTime()).toBe(input - 60 * 60 * 1000);
    });

    it('should keep epoch millis input intact when the date is not in DST', () => {
        isDST.mockReturnValue(false);
        const input = new Date('2024-01-15T12:00:00.000+02:00').getTime();
        const result = pipe.transform(input);
        expect(new Date(result).getTime()).toBe(input);
    });

    it('should return empty string for an unparsable value', () => {
        isDST.mockReturnValue(false);
        expect(pipe.transform('not-a-date')).toBe('');
    });
});
