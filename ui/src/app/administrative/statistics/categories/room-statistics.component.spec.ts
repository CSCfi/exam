// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import type { Participations, QueryParams } from 'src/app/administrative/administrative.model';
import { StatisticsService } from 'src/app/administrative/statistics/statistics.service';
import { vi } from 'vitest';
import { RoomStatisticsComponent } from './room-statistics.component';

/** A local time, as the browser shows it */
const at = (y: number, m: number, d: number, h = 12, min = 0, s = 0) => new Date(y, m - 1, d, h, min, s).toISOString();

describe('RoomStatisticsComponent', () => {
    const statistics = { listParticipations$: vi.fn() };

    const render = (participations: Participations, params: QueryParams) => {
        statistics.listParticipations$.mockReturnValue(of(participations));
        TestBed.configureTestingModule({
            imports: [RoomStatisticsComponent, TranslateModule.forRoot()],
            providers: [{ provide: StatisticsService, useValue: statistics }],
        });
        const fixture = TestBed.createComponent(RoomStatisticsComponent);
        fixture.componentRef.setInput('queryParams', params);
        fixture.detectChanges();
        return fixture.componentInstance;
    };

    const monthsOf = (c: RoomStatisticsComponent) => c.months().map((m) => `${m.getFullYear()}-${m.getMonth() + 1}`);

    it('should ask for the participations of the chosen period', () => {
        const params = { start: at(2026, 1, 1), end: at(2026, 3, 31) };
        render({}, params);
        expect(statistics.listParticipations$).toHaveBeenCalledWith(params);
    });

    it('should list every month from the first participation to the end of the period', () => {
        const c = render(
            { '1___Aquarium': [{ date: at(2026, 1, 31) }], '2___Lab': [{ date: at(2026, 4, 2) }] },
            { end: at(2026, 5, 10) },
        );
        expect(c.rooms()).toEqual(['1___Aquarium', '2___Lab']);
        // Starting on the 31st must not skip February
        expect(monthsOf(c)).toEqual(['2026-1', '2026-2', '2026-3', '2026-4', '2026-5']);
    });

    it('should start from the period start when it is earlier than any participation', () => {
        const c = render(
            { '1___Aquarium': [{ date: at(2026, 3, 15) }] },
            { start: at(2025, 12, 30), end: at(2026, 3, 20) },
        );
        expect(monthsOf(c)).toEqual(['2025-12', '2026-1', '2026-2', '2026-3']);
    });

    it('should list a single month for a period within it', () => {
        const c = render(
            { '1___Aquarium': [{ date: at(2026, 2, 3) }] },
            { start: at(2026, 2, 1), end: at(2026, 2, 28) },
        );
        expect(monthsOf(c)).toEqual(['2026-2']);
    });

    it('should list no months without participations', () => {
        const c = render({}, { start: at(2026, 1, 1), end: at(2026, 3, 1) });
        expect(c.months()).toEqual([]);
    });

    it('should count each participation in its own month, the first and last moments included', () => {
        const c = render(
            {
                '1___Aquarium': [
                    { date: at(2026, 3, 1, 0, 0, 0) },
                    { date: at(2026, 3, 15) },
                    { date: at(2026, 3, 31, 23, 59, 59) },
                    { date: at(2026, 4, 1, 0, 0, 0) },
                ],
                '2___Lab': [{ date: at(2026, 3, 10) }],
            },
            { start: at(2026, 3, 1), end: at(2026, 4, 30) },
        );
        const march = new Date(2026, 2, 1);
        const april = new Date(2026, 3, 1);

        expect(c.totalParticipations(march, '1___Aquarium')).toBe(3);
        expect(c.totalParticipations(april, '1___Aquarium')).toBe(1);
        expect(c.totalParticipations(march, '2___Lab')).toBe(1);
        expect(c.totalParticipations(march)).toBe(4);
        expect(c.totalParticipations(undefined, '1___Aquarium')).toBe(4);
        expect(c.totalParticipations()).toBe(5);
    });
});
