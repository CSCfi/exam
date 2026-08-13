// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StorageService } from 'src/app/shared/storage/storage.service';
import { vi } from 'vitest';
import { CourseCodeService } from './course-code.service';

describe('CourseCodeService', () => {
    let service: CourseCodeService;
    let httpMock: HttpTestingController;
    let mockStorage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockStorage = { get: vi.fn(), set: vi.fn() };
        TestBed.configureTestingModule({
            providers: [
                CourseCodeService,
                { provide: StorageService, useValue: mockStorage },
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(CourseCodeService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        // Cancel any pending prefix-fetch requests before verifying (shareReplay may leave them open)
        httpMock.match('/app/settings/coursecodeprefix').forEach((r) => r.flush({ prefix: '' }));
        httpMock.verify();
    });

    describe('formatCode with a cached prefix', () => {
        it('should strip the last prefix occurrence from the code', () => {
            mockStorage.get.mockReturnValue('_suffix');
            // "course_suffix".split("_suffix") = ["course", ""] → parts.slice(0,1).join → "course"
            expect(service.formatCode('course_suffix')).toBe('course');
        });

        it('should handle a code where the prefix appears multiple times', () => {
            mockStorage.get.mockReturnValue('-');
            // "a-b-c".split("-") = ["a","b","c"] → parts.slice(0,2).join("-") = "a-b"
            expect(service.formatCode('a-b-c')).toBe('a-b');
        });

        it('should return the full code when the prefix is not found in the code', () => {
            mockStorage.get.mockReturnValue('XYZ');
            // "CS-101".split("XYZ") = ["CS-101"] → parts[0] = "CS-101"
            expect(service.formatCode('CS-101')).toBe('CS-101');
        });
    });

    describe('formatCode without a cached prefix', () => {
        it('should return the code unchanged and trigger an HTTP fetch', () => {
            mockStorage.get.mockReturnValue(undefined);
            const result = service.formatCode('CS-101');
            expect(result).toBe('CS-101');
            const req = httpMock.expectOne('/app/settings/coursecodeprefix');
            req.flush({ prefix: 'CS-' });
            expect(mockStorage.set).toHaveBeenCalledWith('COURSE_CODE_PREFIX', 'CS-');
        });
    });
});
