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
import * as moment from 'moment';
import * as toast from 'toastr';
import { StateService } from '@uirouter/core';
import { RoomService } from './room.service';
import { CalendarService, OpeningHours } from '../../calendar/calendar.service';
import { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
import { Availability } from './room.service';

type SuccessFunction = (response: any) => void;

interface AvailableEvent {
    title: string;
    color: string;
    start: Date;
    end: Date;
    availableMachines: number;
}

type RefreshCallBackFn = (events: AvailableEvent[]) => void;

@Component({
    template: require('./availability.component.html'),
    selector: 'availability',
})
export class AvailabilityComponent implements OnInit {
    loader: { loading: boolean };
    openingHours: OpeningHours[];
    exceptionHours: ExceptionWorkingHours[];
    room: ExamRoom;
    showCalendar = false;

    constructor(private state: StateService, private roomService: RoomService, private calendar: CalendarService) {}

    ngOnInit() {
        this.loader = {
            loading: false,
        };
        this.roomService.getRoom(this.state.params.id).subscribe(room => {
            this.openingHours = this.calendar.processOpeningHours(room);
            this.exceptionHours = this.calendar.getExceptionalAvailability(room);
            this.room = room;
            this.showCalendar = true;
        });
    }

    query = (successFn: SuccessFunction, date: string) => {
        this.roomService.getAvailability(this.state.params.id, date).subscribe(successFn, error => toast.error(error));
    };

    adjust = (date: Date, tz: string) => {
        const adjusted = moment.tz(date, tz);
        const offset = adjusted.isDST() ? -1 : 0;
        return adjusted.add(offset, 'hour').format();
    };

    getColor = (slot: Availability) => {
        const ratio = slot.reserved / slot.total;
        if (ratio <= 0.5) return '#A6E9B2';
        if (ratio <= 0.9) return '#FCF8E3';
        return '#266B99';
    };

    refresh = (start: moment.Moment, callback: RefreshCallBackFn) => {
        if (!this.room) {
            return;
        }
        const date = start.format();
        this.loader.loading = true;
        const tz = this.room.localTimezone;
        const successFn = (resp: any) => {
            const events = resp.map((slot: Availability) => {
                return {
                    title: slot.reserved + ' / ' + slot.total,
                    color: this.getColor(slot),
                    start: this.adjust(slot.start, tz),
                    end: this.adjust(slot.end, tz),
                    availableMachines: 0,
                };
            });
            callback(events);
            this.loader.loading = false;
        };
        this.query(successFn, date);
    };
}
