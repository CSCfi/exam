// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { KeyValuePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { groupBy } from 'ramda';
import { QueryParams, StatisticsService } from 'src/app/administrative/statistics/statistics.service';
import { Reservation } from 'src/app/reservation/reservation.model';

@Component({
    template: `
        <div class="row my-2">
            <div class="col-12">
                <button class="btn btn-sm btn-primary" (click)="listReservations()">
                    {{ 'i18n_search' | translate }}
                </button>
            </div>
        </div>
        @if (grouped) {
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
                            @for (rg of grouped | keyvalue; track rg.key) {
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
    standalone: true,
    imports: [KeyValuePipe, TranslateModule],
})
export class IopReservationStatisticsComponent {
    @Input() queryParams: QueryParams = {};

    reservations: Reservation[] = [];
    grouped: Record<string, Reservation[]> = {};

    constructor(private Statistics: StatisticsService) {}

    listReservations = () =>
        this.Statistics.listIopReservations$(this.queryParams).subscribe((resp) => {
            const byOrg = groupBy((r: Reservation) => r.externalOrgName || r.externalReservation?.orgName || '');
            this.grouped = byOrg(resp) as Record<string, Reservation[]>;
        });

    incomingFrom = (org: keyof typeof this.grouped): number =>
        this.grouped[org].filter((r) => r.externalOrgRef && r.enrolment?.externalExam?.finished).length;
    incomingNoShowsFrom = (org: keyof typeof this.grouped): number =>
        this.grouped[org].filter((r) => r.externalOrgRef && !r.enrolment?.externalExam?.finished).length;
    outgoingTo = (org: keyof typeof this.grouped): number =>
        this.grouped[org].filter((r) => r.externalReservation?.orgName && r.enrolment?.noShow === false).length;
    outgoingNoShowsTo = (org: keyof typeof this.grouped): number =>
        this.grouped[org].filter((r) => r.externalReservation?.orgName && r.enrolment?.noShow === true).length;
    totalIncoming = () => this.reduce(this.incomingFrom);
    totalOutgoing = () => this.reduce(this.outgoingTo);
    totalIncomingNoShows = () => this.reduce(this.incomingNoShowsFrom);
    totalOutgoingNoShows = () => this.reduce(this.outgoingNoShowsTo);

    private reduce = (fn: (org: keyof typeof this.grouped) => number) =>
        Object.keys(this.grouped)
            .map(fn)
            .reduce((a, b) => a + b, 0);
}
