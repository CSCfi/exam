// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { vi } from 'vitest';
import { ApplyDstPipe } from './apply-dst.pipe';
import { DateTimeService } from './date.service';

describe('ApplyDstPipe', () => {
    let pipe: ApplyDstPipe;
    let mockDateTimeService: { isDST: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockDateTimeService = { isDST: vi.fn() };
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [{ provide: DateTimeService, useValue: mockDateTimeService }],
        });
        pipe = TestBed.runInInjectionContext(() => new ApplyDstPipe());
    });

    it('should return empty string for undefined input', () => {
        expect(pipe.transform(undefined)).toBe('');
    });

    it('should return empty string for empty string input', () => {
        expect(pipe.transform('')).toBe('');
    });

    it('should subtract one hour when the date is in DST', () => {
        mockDateTimeService.isDST.mockReturnValue(true);
        const input = '2024-07-15T12:00:00.000+03:00';
        const result = pipe.transform(input);
        // Compare as UTC timestamps so the test is timezone-agnostic:
        // Luxon may preserve the original offset or normalize to UTC depending on the system zone.
        expect(new Date(result).getTime()).toBe(new Date(input).getTime() - 60 * 60 * 1000);
    });

    it('should keep the instant intact when the date is not in DST', () => {
        mockDateTimeService.isDST.mockReturnValue(false);
        const input = '2024-01-15T12:00:00.000+02:00';
        const result = pipe.transform(input);
        expect(new Date(result).getTime()).toBe(new Date(input).getTime());
    });

    it('should subtract one hour from epoch millis input when the date is in DST', () => {
        mockDateTimeService.isDST.mockReturnValue(true);
        const input = new Date('2024-07-15T12:00:00.000+03:00').getTime();
        const result = pipe.transform(input);
        expect(new Date(result).getTime()).toBe(input - 60 * 60 * 1000);
    });

    it('should keep epoch millis input intact when the date is not in DST', () => {
        mockDateTimeService.isDST.mockReturnValue(false);
        const input = new Date('2024-01-15T12:00:00.000+02:00').getTime();
        const result = pipe.transform(input);
        expect(new Date(result).getTime()).toBe(input);
    });

    it('should return empty string for an unparsable value', () => {
        mockDateTimeService.isDST.mockReturnValue(false);
        expect(pipe.transform('not-a-date')).toBe('');
    });
});
