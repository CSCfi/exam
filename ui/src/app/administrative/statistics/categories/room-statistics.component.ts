// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Participations, QueryParams } from 'src/app/administrative/administrative.model';
import { StatisticsService } from 'src/app/administrative/statistics/statistics.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="row my-2">
            <div class="col-12">
                <button class="btn btn-sm btn-primary" (click)="listParticipations()">
                    {{ 'i18n_search' | translate }}
                </button>
            </div>
        </div>
        <div class="row">
            <div class="col-12" style="overflow: auto">
                <table class="table table-sm table-bordered table-striped">
                    <thead>
                        <th>
                            <strong>{{ 'i18n_year' | translate }}</strong>
                        </th>
                        <th>
                            <strong>{{ 'i18n_month' | translate }}</strong>
                        </th>
                        @for (room of rooms(); track room) {
                            <th>{{ room.split('___')[1] }}</th>
                        }
                        <th>
                            <strong>{{ 'i18n_total' | translate }}</strong>
                        </th>
                    </thead>
                    <tbody>
                        @for (month of months(); track month.toISOString()) {
                            <tr>
                                <td>
                                    <strong>{{ month | date: 'yyyy' }}</strong>
                                </td>
                                <td>
                                    <strong>{{ month | date: 'M' }}</strong>
                                </td>
                                @for (room of rooms(); track room) {
                                    <td>{{ totalParticipations(month, room) }}</td>
                                }
                                <td>
                                    <strong>{{ totalParticipations(month) }}</strong>
                                </td>
                            </tr>
                        }
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2">
                                <strong>{{ 'i18n_total' | translate }}</strong>
                            </td>
                            @for (room of rooms(); track room) {
                                <td>{{ totalParticipations(undefined, room) }}</td>
                            }
                            <td>
                                <b>{{ totalParticipations() }}</b>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `,
    selector: 'xm-room-statistics',
    imports: [DatePipe, TranslateModule],
})
export class RoomStatisticsComponent {
    queryParams = input<QueryParams>({});
    participations = signal<Participations>({});
    rooms = signal<string[]>([]);
    months = signal<Date[]>([]);

    private Statistics = inject(StatisticsService);

    listParticipations() {
        this.Statistics.listParticipations$(this.queryParams()).subscribe((resp) => {
            this.participations.set(resp);
            const currentParticipations = this.participations();
            if (Object.values(currentParticipations).flat().length > 0) {
                this.rooms.set(Object.keys(currentParticipations));
                this.groupByMonths();
            } else {
                this.rooms.set([]);
                this.months.set([]);
            }
        });
    }

    totalParticipations(month?: Date, room?: string): number {
        const currentParticipations = this.participations();
        if (!currentParticipations) return 0;
        const isWithinBounds = (data: { date: string }) => {
            const date = new Date(data.date);
            const current = month ? new Date(month) : new Date();
            const min = new Date(current.getFullYear(), current.getMonth(), 1);
            const max = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
            return date > min && date < max;
        };
        const rp = room ? currentParticipations[room] : Object.values(currentParticipations).flat();
        return month ? rp.filter(isWithinBounds).length : rp.length;
    }

    private groupByMonths() {
        const currentParticipations = this.participations();
        if (Object.keys(currentParticipations).length === 0) {
            return;
        }
        const months: Date[] = [];
        const limits = this.getMinAndMaxDates();
        months.push(limits.min);
        let current = new Date(limits.min);
        let next = new Date(new Date(current).setMonth(current.getMonth() + 1));
        const last = new Date(limits.max);
        while (this.isBefore(next, last)) {
            months.push(next);
            current = next;
            next = new Date(new Date(current).setMonth(current.getMonth() + 1));
        }
        if (this.isBefore(new Date(limits.min), last)) {
            months.push(limits.max);
        }
        this.months.set(months);
    }

    private isBefore(a: Date, b: Date): boolean {
        return (
            a.getFullYear() < b.getFullYear() || (a.getFullYear() === b.getFullYear() && a.getMonth() < b.getMonth())
        );
    }

    private getMinAndMaxDates(): { min: Date; max: Date } {
        const currentParticipations = this.participations();
        const currentQueryParams = this.queryParams();
        const dates: Date[] = Object.values(currentParticipations)
            .flatMap((ps) => ps.map((d) => new Date(d.date)))
            .sort((a, b) => a.getTime() - b.getTime());
        let minDate = dates[0];
        // Set min date to which one is earlier: participation or search date
        if (currentQueryParams.start && new Date(currentQueryParams.start) < minDate) {
            minDate = new Date(currentQueryParams.start);
        }
        // Set max date to either now or requested end date (if any)
        if (currentQueryParams.end) {
            dates.push(new Date(currentQueryParams.end));
        } else {
            dates.push(new Date());
        }
        const maxDate = dates[dates.length - 1];
        return { min: minDate, max: maxDate };
    }
}
