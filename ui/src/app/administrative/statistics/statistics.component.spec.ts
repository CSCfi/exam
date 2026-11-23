// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { StatisticsComponent } from './statistics.component';
import { StatisticsService } from './statistics.service';

describe('StatisticsComponent', () => {
    let c: StatisticsComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: StatisticsService,
                    useValue: { listDepartments$: vi.fn(() => of({ departments: ['Physics', 'Chemistry', 'Law'] })) },
                },
            ],
        });
        c = TestBed.runInInjectionContext(() => new StatisticsComponent());
    });

    const toggle = (name: string) => c.setDepartmentFilter(c.departments().find((d) => d.name === name)!);

    it('should start with every department and no filters', () => {
        expect(c.departments().map((d) => d.name)).toEqual(['Physics', 'Chemistry', 'Law']);
        expect(c.queryParams()).toEqual({});
    });

    it('should send the chosen dates as instants and the chosen departments', () => {
        // Local midnights, as the date pickers give them
        const start = new Date(2026, 0, 1);
        const end = new Date(2026, 5, 30);
        c.startDateChanged({ date: start });
        c.endDateChanged({ date: end });
        toggle('Law');
        toggle('Physics');

        expect(c.queryParams()).toEqual({
            start: start.toISOString(),
            end: end.toISOString(),
            dept: ['Physics', 'Law'],
        });
        toggle('Law');
        expect(c.queryParams().dept).toEqual(['Physics']);
    });

    it('should narrow the department list by name, ignoring case', () => {
        c.departmentFilter = 'PH';
        expect(c.filteredDepartments().map((d) => d.name)).toEqual(['Physics']);
        c.onDepartmentFilterInput({ target: { value: '' } } as unknown as Event);
        expect(c.filteredDepartments()).toHaveLength(3);
    });

    it('should search only when asked, and forget the search on another tab', () => {
        c.startDateChanged({ date: new Date(2026, 0, 1) });
        expect(c.confirmedQueryParams()).toBeNull();
        c.search();
        expect(c.confirmedQueryParams()).toEqual(c.queryParams());

        c.view = 'ROOMS' as typeof c.view;
        expect(c.view).toBe('ROOMS');
        expect(c.confirmedQueryParams()).toBeNull();
    });
});
