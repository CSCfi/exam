// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { EventInput } from '@fullcalendar/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { BookingCalendarComponent } from 'src/app/calendar/booking-calendar.component';
import { CalendarService } from 'src/app/calendar/calendar.service';
import { Availability } from 'src/app/facility/facility.model';
import type { ExamRoom, ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
import { RoomService } from './room.service';

type ExceptionHour = ExceptionWorkingHours & { start: string; end: string; description: string };

@Component({
    templateUrl: './availability.component.html',
    selector: 'xm-availability',
    styles: [
        `
            .black-event-text span {
                color: black !important;
            }
        `,
    ],
    imports: [BookingCalendarComponent, TranslateModule, NgbPopover],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvailabilityComponent {
    readonly room = input.required<ExamRoom>();

    readonly openingHours = computed(() => this.calendar.processOpeningHours(this.room()));
    readonly exceptionHours = computed<ExceptionHour[]>(() =>
        this.calendar
            .getExceptionalAvailability(this.room())
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    );
    readonly newExceptions = computed(() =>
        this.exceptionHours().filter(
            (ee) => new Date(ee.endDate) > new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000),
        ),
    );
    readonly oldExceptionsHidden = signal(true);

    private readonly toast = inject(ToastrService);
    private readonly roomService = inject(RoomService);
    private readonly calendar = inject(CalendarService);

    query$(date: string) {
        return this.roomService.getAvailability$(this.room().id, date);
    }

    getColor(slot: Availability) {
        const ratio = slot.reserved / slot.total;
        if (ratio <= 0.5) return '#a6e9b2'; // green;
        if (ratio <= 0.9) return '#8f8f8f'; // grey
        return '#f50f35'; // red
    }

    isInFuture(date: string): boolean {
        return new Date(date) > new Date();
    }
    isNow(startDate: string, endDate: string): boolean {
        return new Date(startDate) < new Date() && new Date(endDate) > new Date();
    }

    toggleOldExceptionsHidden() {
        this.oldExceptionsHidden.update((v) => !v);
    }

    refresh($event: { date: string; timeZone: string; success: (events: EventInput[]) => void }) {
        const currentRoom = this.room();
        if (!currentRoom) {
            return;
        }
        const start = DateTime.fromISO($event.date, { zone: $event.timeZone }).startOf('week');
        const successFn = (resp: Availability[]) => {
            const events: EventInput[] = resp.map((slot: Availability, i) => ({
                id: i.toString(),
                title: slot.reserved + ' / ' + slot.total,
                start: this.adjust(slot.start, currentRoom?.localTimezone as string),
                end: this.adjust(slot.end, currentRoom?.localTimezone as string),
                color: this.getColor(slot),
                textColor: 'black',
                availableMachines: 0,
            }));
            $event.success(events);
        };
        const errorFn = (resp: string) => this.toast.error(resp);
        this.query$(start.toFormat('yyyy-MM-dd')).subscribe({ next: successFn, error: errorFn });
    }

    private adjust(date: string, tz: string): Date {
        return DateTime.fromISO(date, { zone: tz }).toJSDate();
    }
}
