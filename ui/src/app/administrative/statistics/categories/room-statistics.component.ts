/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamParticipation } from '../../../exam/exam.model';
import type { Participations, QueryParams } from '../statistics.service';
import { StatisticsService } from '../statistics.service';

@Component({
    template: `
        <div class="detail-row">
            <div class="col-md-12">
                <button class="btn btn-primary" (click)="listParticipations()">
                    {{ 'i18n_search' | translate }}
                </button>
            </div>
        </div>
        <div class="main-row">
            <div class="col-md-12" style="overflow: auto">
                <table class="table table-sm table-bordered table-striped">
                    <thead>
                        <th class="warning">{{ 'i18n_year' | translate }}</th>
                        <th class="warning">{{ 'i18n_month' | translate }}</th>
                        @for (room of rooms; track room) {
                            <th>{{ room.split('___')[1] }}</th>
                        }
                        <th class="success">{{ 'i18n_total' | translate }}</th>
                    </thead>
                    <tbody>
                        @for (month of months; track month) {
                            <tr>
                                <td class="warning">{{ month | date: 'yyyy' }}</td>
                                <td class="warning">{{ month | date: 'M' }}</td>
                                @for (room of rooms; track room) {
                                    <td>{{ totalParticipations(month, room) }}</td>
                                }
                                <td class="success">{{ totalParticipations(month) }}</td>
                            </tr>
                        }
                    </tbody>
                    <tfoot>
                        <tr class="success">
                            <td colspan="2">
                                <b>{{ 'i18n_total' | translate }}</b>
                            </td>
                            @for (room of rooms; track room) {
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
    standalone: true,
    imports: [DatePipe, TranslateModule],
})
export class RoomStatisticsComponent {
    @Input() queryParams: QueryParams = {};
    participations: Participations = {};
    rooms: string[] = [];
    months: Date[] = [];

    constructor(private Statistics: StatisticsService) {}

    listParticipations = () =>
        this.Statistics.listParticipations$(this.queryParams).subscribe((resp) => {
            this.participations = resp;
            if (Object.values(this.participations).flat().length > 0) {
                this.rooms = Object.keys(this.participations);
                this.groupByMonths();
            } else {
                this.rooms = [];
                this.months = [];
            }
        });

    totalParticipations = (month?: Date, room?: string) => {
        if (!this.participations) return 0;
        const isWithinBounds = (p: ExamParticipation) => {
            const date = new Date(p.externalExam ? p.externalExam.started : p.exam.created);
            const current = month ? new Date(month) : new Date();
            const min = new Date(current.getFullYear(), current.getMonth(), 1);
            const max = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
            return date > min && date < max;
        };
        const rp = room ? this.participations[room] : Object.values(this.participations).flat();
        return month ? rp.filter(isWithinBounds).length : rp.length;
    };

    private groupByMonths = () => {
        if (Object.keys(this.participations).length === 0) {
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
        this.months = months;
    };

    private isBefore = (a: Date, b: Date) =>
        a.getFullYear() < b.getFullYear() || (a.getFullYear() === b.getFullYear() && a.getMonth() < b.getMonth());

    private getMinAndMaxDates = (): { min: Date; max: Date } => {
        const dates: Date[] = Object.values(this.participations)
            .flatMap((ps) =>
                ps
                    .filter((p) => p.exam || p.externalExam)
                    .map((p) => (p.externalExam ? p.externalExam.started : p.exam.created))
                    .map((d) => new Date(d)),
            )
            .sort((a, b) => a.getTime() - b.getTime());
        let minDate = dates[0];
        // Set min date to which one is earlier: participation or search date
        if (this.queryParams.start && new Date(this.queryParams.start) < minDate) {
            minDate = new Date(this.queryParams.start);
        }
        // Set max date to either now or requested end date (if any)
        if (this.queryParams.end) {
            dates.push(new Date(this.queryParams.end));
        } else {
            dates.push(new Date());
        }
        const maxDate = dates[dates.length - 1];
        return { min: minDate, max: maxDate };
    };
}
