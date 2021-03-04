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
import { Component, OnInit } from '@angular/core';
import { UIRouterGlobals } from '@uirouter/core';
import { CalendarEvent } from 'angular-calendar';
import * as moment from 'moment';
import * as toast from 'toastr';

import { SlotMeta } from '../../calendar/bookingCalendar.component';
import { CalendarService, OpeningHours } from '../../calendar/calendar.service';
import { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
import { Availability, RoomService } from './room.service';

type SuccessFunction = (response: Availability[]) => void;

interface AvailableEvent {
    title: string;
    color: string;
    start: string;
    end: string;
    availableMachines: number;
}

type RefreshCallBackFn = (events: AvailableEvent[]) => void;

@Component({
    templateUrl: './availability.component.html',
    selector: 'app-availability',
})
export class AvailabilityComponent implements OnInit {
    loader: { loading: boolean };
    openingHours: OpeningHours[];
    exceptionHours: ExceptionWorkingHours[];
    room: ExamRoom;
    showCalendar = false;
    events: CalendarEvent<SlotMeta>[] = [];

    constructor(
        private routing: UIRouterGlobals,
        private roomService: RoomService,
        private calendar: CalendarService,
    ) {}

    ngOnInit() {
        this.loader = {
            loading: false,
        };
        this.roomService.getRoom(this.routing.params.id).subscribe((room) => {
            this.openingHours = this.calendar.processOpeningHours(room);
            this.exceptionHours = this.calendar.getExceptionalAvailability(room);
            this.room = room;
            this.showCalendar = true;
        });
    }

    query = (successFn: SuccessFunction, date: string) => {
        this.roomService
            .getAvailability$(this.routing.params.id, date)
            .subscribe(successFn, (error) => toast.error(error));
    };

    adjust = (date: string, tz: string): string => {
        const adjusted = moment.tz(date, tz);
        const offset = adjusted.isDST() ? -1 : 0;
        return adjusted.add(offset, 'hour').format();
    };

    getColor = (slot: Availability) => {
        const ratio = slot.reserved / slot.total;
        if (ratio <= 0.5) {
            return { primary: '#A6E9B2', secondary: '#A6E9B2' };
        }
        if (ratio <= 0.9) {
            return { primary: '#FCF8E3', secondary: '#FCF8E3' };
        }
        return { primary: '#266B99', secondary: '#266B99' };
    };

    refresh = (event: { date: Date }) => {
        if (!this.room) {
            return;
        }
        const date = moment(event.date).format();
        this.loader.loading = true;
        const tz = this.room.localTimezone;
        const successFn = (resp: Availability[]) => {
            this.events = resp.map((slot: Availability) => {
                return {
                    title: slot.reserved + ' / ' + slot.total,
                    color: this.getColor(slot),
                    start: new Date(this.adjust(slot.start, tz)),
                    end: new Date(this.adjust(slot.end, tz)),
                    availableMachines: 0,
                };
            });
            this.loader.loading = false;
        };
        this.query(successFn, date);
    };
}
