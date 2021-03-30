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
import { Component } from '@angular/core';
import { StateService } from '@uirouter/core';
import * as moment from 'moment';
import * as toast from 'toastr';

import { CalendarService } from '../../calendar/calendar.service';
import { RoomService } from './room.service';

import type { OnInit } from '@angular/core';
import type { OpeningHours } from '../../calendar/calendar.service';
import type { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
import type { Availability } from './room.service';
import type { SlotMeta } from '../../calendar/bookingCalendar.component';
import type { CalendarEvent } from 'calendar-utils';

@Component({
    templateUrl: './availability.component.html',
    selector: 'availability',
    styles: [
        `
            .black-event-text span {
                color: black !important;
            }
        `,
    ],
})
export class AvailabilityComponent implements OnInit {
    openingHours: OpeningHours[];
    exceptionHours: (ExceptionWorkingHours & { start: string; end: string; description: string })[];
    room: ExamRoom;
    events: CalendarEvent<SlotMeta>[] = [];

    constructor(private state: StateService, private roomService: RoomService, private calendar: CalendarService) {}

    ngOnInit() {
        this.roomService.getRoom(this.state.params.id).subscribe((room) => {
            this.openingHours = this.calendar.processOpeningHours(room);
            this.exceptionHours = this.calendar.getExceptionalAvailability(room);
            this.room = room;
        });
    }

    query$ = (date: string) => this.roomService.getAvailability(this.state.params.id, date);

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
                start: new Date(slot.start),
                end: new Date(slot.end),
                color: this.getColor(slot),
                cssClass: 'black-event-text',
                meta: { availableMachines: 0 },
            }));
        };
        const errorFn = (resp: string) => toast.error(resp);
        this.query$(moment(event.date).format('YYYY-MM-DD')).subscribe(successFn, errorFn);
    };
}
