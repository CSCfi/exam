/*
 * Copyright (c) 2017 Exam Consortium
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
import { NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { EventInput } from '@fullcalendar/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { BookingCalendarComponent } from 'src/app/calendar/booking-calendar.component';
import type { OpeningHours } from 'src/app/calendar/calendar.service';
import { CalendarService } from 'src/app/calendar/calendar.service';
import type { ExamRoom, ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
import type { Availability } from './room.service';
import { RoomService } from './room.service';

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
    standalone: true,
    imports: [NgClass, BookingCalendarComponent, TranslateModule, NgbPopover],
})
export class AvailabilityComponent implements OnInit {
    @Input() room!: ExamRoom;
    openingHours: OpeningHours[] = [];
    exceptionHours: (ExceptionWorkingHours & { start: string; end: string; description: string })[] = [];
    newExceptions: (ExceptionWorkingHours & { start: string; end: string; description: string })[] = [];
    oldExceptionsHidden = true;

    constructor(
        private toast: ToastrService,
        private roomService: RoomService,
        private calendar: CalendarService,
    ) {}

    ngOnInit() {
        if (!this.room) {
            console.error('No room given for availability.component');
            return;
        }
        this.openingHours = this.calendar.processOpeningHours(this.room);
        this.exceptionHours = this.calendar
            .getExceptionalAvailability(this.room)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        this.newExceptions = this.calendar
            .getExceptionalAvailability(this.room)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .filter((ee) => new Date(ee.endDate) > new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000));
    }

    query$ = (date: string) => this.roomService.getAvailability$(this.room.id, date);

    getColor = (slot: Availability) => {
        const ratio = slot.reserved / slot.total;
        if (ratio <= 0.5) return '#a6e9b2'; // green;
        if (ratio <= 0.9) return '#8f8f8f'; // grey
        return '#f50f35'; // red
    };

    isInFuture(date: string): boolean {
        return new Date(date) > new Date();
    }
    isNow(startDate: string, endDate: string): boolean {
        return new Date(startDate) < new Date() && new Date(endDate) > new Date();
    }

    refresh = ($event: { date: string; timeZone: string; success: (events: EventInput[]) => void }) => {
        if (!this.room) {
            return;
        }
        const start = DateTime.fromISO($event.date, { zone: $event.timeZone }).startOf('week');
        const successFn = (resp: Availability[]) => {
            const events: EventInput[] = resp.map((slot: Availability, i) => ({
                id: i.toString(),
                title: slot.reserved + ' / ' + slot.total,
                start: this.adjust(slot.start, this.room?.localTimezone as string),
                end: this.adjust(slot.end, this.room?.localTimezone as string),
                color: this.getColor(slot),
                textColor: 'black',
                availableMachines: 0,
            }));
            $event.success(events);
        };
        const errorFn = (resp: string) => this.toast.error(resp);
        this.query$(start.toFormat('yyyy-MM-dd')).subscribe({ next: successFn, error: errorFn });
    };

    private adjust = (date: string, tz: string): Date => {
        const adjusted = DateTime.fromISO(date, { zone: tz });
        const offset = adjusted.isInDST ? -1 : 0;
        return adjusted.plus({ hours: offset }).toJSDate();
    };
}
