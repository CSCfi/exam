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
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { CalendarEvent } from 'calendar-utils';
import { addHours, format } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';
import { ToastrService } from 'ngx-toastr';
import type { SlotMeta } from '../../calendar/booking-calendar.component';
import type { OpeningHours } from '../../calendar/calendar.service';
import { CalendarService } from '../../calendar/calendar.service';
import type { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
import { DateTimeService } from '../../shared/date/date.service';
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
})
export class AvailabilityComponent implements OnInit {
    @Input() room!: ExamRoom;
    openingHours: OpeningHours[] = [];
    exceptionHours: (ExceptionWorkingHours & { start: string; end: string; description: string })[] = [];
    events: CalendarEvent<SlotMeta>[] = [];

    constructor(
        private route: ActivatedRoute,
        private toast: ToastrService,
        private roomService: RoomService,
        private calendar: CalendarService,
        private DateTime: DateTimeService,
    ) {}

    ngOnInit() {
        if (!this.room) {
            console.error('No room given for availability.component');
            return;
        }
        this.openingHours = this.calendar.processOpeningHours(this.room);
        this.exceptionHours = this.calendar.getExceptionalAvailability(this.room);
    }

    query$ = (date: string) => this.roomService.getAvailability$(this.room.id, date);

    getColor = (slot: Availability) => {
        const ratio = slot.reserved / slot.total;
        if (ratio <= 0.5) return { primary: '#27542f', secondary: '#a6e9b2' }; // green;
        if (ratio <= 0.9) return { primary: '#8f8f8f', secondary: '#d8d8d8' }; // grey
        return { primary: '#f50f35', secondary: '#fc3858' }; // red
    };

    refresh = (event: { date: Date }) => {
        if (!this.room) {
            return;
        }
        const successFn = (resp: Availability[]) => {
            this.events = resp.map((slot: Availability, i) => ({
                id: i,
                title: slot.reserved + ' / ' + slot.total,
                start: this.adjust(slot.start, this.room?.localTimezone as string),
                end: this.adjust(slot.end, this.room?.localTimezone as string),
                color: this.getColor(slot),
                cssClass: 'black-event-text',
                meta: { availableMachines: 0 },
            }));
        };
        const errorFn = (resp: string) => this.toast.error(resp);
        this.query$(format(event.date, 'yyyy-MM-dd')).subscribe({ next: successFn, error: errorFn });
    };

    private adjust = (date: string, tz: string): Date => {
        const adjusted = zonedTimeToUtc(date, tz);
        const offset = this.DateTime.isDST(adjusted) ? -1 : 0;
        return addHours(adjusted, offset);
    };
}
