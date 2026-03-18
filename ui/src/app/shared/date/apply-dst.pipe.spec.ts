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
        expect(result).toContain('11:00:00');
    });

    it('should return the original string when the date is not in DST', () => {
        mockDateTimeService.isDST.mockReturnValue(false);
        const input = '2024-01-15T12:00:00.000+02:00';
        const result = pipe.transform(input);
        expect(result).toBe(input);
    });
});
