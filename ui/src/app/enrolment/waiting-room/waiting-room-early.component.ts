// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { WaitingEnrolment, WaitingReservation } from './waiting-room.component';

@Component({
    selector: 'xm-waiting-room-early',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <xm-page-header text="i18n_exam_is_about_to_begin" />
        <xm-page-content [content]="content" />
        <ng-template #content>
            <div class="alert alert-secondary" [attr.aria-live]="'polite'">
                <i class="bi bi-exclamation-circle-fill me-2"></i>
                <span [attr.aria-live]="'polite'">{{ 'i18n_you_are_early_for_examination' | translate }}</span>
                @if (enrolment()) {
                    {{ enrolment()!.reservation.startAt | date: 'HH:mm' }}
                }
            </div>
        </ng-template>
    `,
    styleUrls: ['../enrolment.shared.scss'],
    imports: [DatePipe, TranslateModule, PageHeaderComponent, PageContentComponent],
})
export class WaitingRoomEarlyComponent {
    enrolment = signal<WaitingEnrolment | undefined>(undefined);

    private route = inject(ActivatedRoute);
    private http = inject(HttpClient);
    private toast = inject(ToastrService);

    constructor() {
        if (this.route.snapshot.params.id && this.route.snapshot.params.hash) {
            this.http.get<WaitingEnrolment>(`/app/student/enrolments/${this.route.snapshot.params.id}`).subscribe({
                next: (enrolment) => {
                    this.setOccasion(enrolment.reservation);
                    this.enrolment.set(enrolment);
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    private setOccasion(reservation: WaitingReservation) {
        if (!reservation) {
            return;
        }
        const tz = reservation.machine.room.localTimezone;
        const start = DateTime.fromISO(reservation.startAt, { zone: tz });
        const end = DateTime.fromISO(reservation.endAt, { zone: tz });
        reservation.occasion = {
            startAt: start.minus({ hour: start.isInDST ? 1 : 0 }).toLocaleString(DateTime.TIME_24_SIMPLE),
            endAt: end.minus({ hour: end.isInDST ? 1 : 0 }).toLocaleString(DateTime.TIME_24_SIMPLE),
        };
    }
}
