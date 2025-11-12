// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { QueryParams } from 'src/app/administrative/administrative.model';
import { StatisticsService } from 'src/app/administrative/statistics/statistics.service';
import { Reservation } from 'src/app/reservation/reservation.model';
import { groupBy } from 'src/app/shared/miscellaneous/helpers';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="row my-2">
            <div class="col-12">
                <button class="btn btn-sm btn-primary" (click)="listReservations()">
                    {{ 'i18n_search' | translate }}
                </button>
            </div>
        </div>
        @if (grouped()) {
            <div class="row">
                <div class="col-12">
                    <table class="table table-striped table-sm">
                        <thead class="table-light">
                            <tr>
                                <th>{{ 'i18n_faculty_name' | translate }}</th>
                                <th>{{ 'i18n_outbound_reservations' | translate }}</th>
                                <th>
                                    {{ 'i18n_outbound_reservations' | translate }} -
                                    {{ 'i18n_unused_reservation' | translate }}
                                </th>
                                <th>{{ 'i18n_inbound_reservations' | translate }}</th>
                                <th>
                                    {{ 'i18n_inbound_reservations' | translate }} -
                                    {{ 'i18n_unused_reservation' | translate }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (rg of grouped() | keyvalue; track rg.key) {
                                <tr>
                                    <td>{{ rg.key }}</td>
                                    <td>{{ outgoingTo(rg.key) }}</td>
                                    <td>{{ outgoingNoShowsTo(rg.key) }}</td>
                                    <td>{{ incomingFrom(rg.key) }}</td>
                                    <td>{{ incomingNoShowsFrom(rg.key) }}</td>
                                </tr>
                            }
                        </tbody>
                        <tfoot class="table-light">
                            <tr>
                                <td>
                                    <strong>{{ 'i18n_total' | translate }}</strong>
                                </td>
                                <td>
                                    <strong>{{ totalOutgoing() }}</strong>
                                </td>
                                <td>
                                    <strong>{{ totalOutgoingNoShows() }}</strong>
                                </td>
                                <td>
                                    <strong>{{ totalIncoming() }}</strong>
                                </td>
                                <td>
                                    <strong>{{ totalIncomingNoShows() }}</strong>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        }
    `,
    selector: 'xm-iop-reservation-statistics',
    imports: [KeyValuePipe, TranslateModule],
})
export class IopReservationStatisticsComponent {
    queryParams = input<QueryParams>({});
    reservations = signal<Reservation[]>([]);
    grouped = signal<Record<string, Reservation[]>>({});

    private Statistics = inject(StatisticsService);

    listReservations() {
        this.Statistics.listIopReservations$(this.queryParams()).subscribe((resp) => {
            const groupedData = groupBy(
                resp,
                (r: Reservation) => r.externalOrgName || r.externalReservation?.orgName || '',
            );
            console.log(groupedData);
            this.grouped.set(groupedData);
        });
    }

    incomingFrom(org: string): number {
        const currentGrouped = this.grouped();
        return currentGrouped[org]?.filter((r) => r.externalOrgRef && r.enrolment?.externalExam?.finished).length || 0;
    }

    incomingNoShowsFrom(org: string): number {
        const currentGrouped = this.grouped();
        return currentGrouped[org]?.filter((r) => r.externalOrgRef && !r.enrolment?.externalExam?.finished).length || 0;
    }

    outgoingTo(org: string): number {
        const currentGrouped = this.grouped();
        return (
            currentGrouped[org]?.filter((r) => r.externalReservation?.orgName && r.enrolment?.noShow === false)
                .length || 0
        );
    }

    outgoingNoShowsTo(org: string): number {
        const currentGrouped = this.grouped();
        return (
            currentGrouped[org]?.filter((r) => r.externalReservation?.orgName && r.enrolment?.noShow === true).length ||
            0
        );
    }

    totalIncoming(): number {
        return this.reduce(this.incomingFrom.bind(this));
    }

    totalOutgoing(): number {
        return this.reduce(this.outgoingTo.bind(this));
    }

    totalIncomingNoShows(): number {
        return this.reduce(this.incomingNoShowsFrom.bind(this));
    }

    totalOutgoingNoShows(): number {
        return this.reduce(this.outgoingNoShowsTo.bind(this));
    }

    private reduce(fn: (org: string) => number): number {
        return Object.keys(this.grouped())
            .map(fn)
            .reduce((a, b) => a + b, 0);
    }
}
