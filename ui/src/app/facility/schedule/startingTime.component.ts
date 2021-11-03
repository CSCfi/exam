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
import { Component, Input } from '@angular/core';
import * as moment from 'moment';

import { RoomService } from '../rooms/room.service';

import type { OnInit } from '@angular/core';
import type { WorkingHour } from '../rooms/room.service';

@Component({
    templateUrl: './startingTime.component.html',
    selector: 'starting-time',
})
export class StartingTimeComponent implements OnInit {
    @Input() roomIds: number[] = [];
    @Input() startingHours: WorkingHour[] = [];

    examStartingHours: WorkingHour[] = [];
    examStartingHourOffset = 0;

    constructor(private room: RoomService) {}

    ngOnInit() {
        this.examStartingHours = [...Array(24)].map(function (x, i) {
            return { startingHour: i + ':00', selected: true };
        });
        if (this.startingHours && this.startingHours.length > 0) {
            const startingHourDates = this.startingHours.map(function (hour) {
                return moment(hour.startingHour);
            });
            this.examStartingHourOffset = startingHourDates[0].minute();
            const startingHours = startingHourDates.map((hour) => {
                return hour.format('H:mm');
            });
            this.setStartingHourOffset();
            this.examStartingHours.forEach((hour) => {
                hour.selected = startingHours.indexOf(hour.startingHour) !== -1;
            });
        }
    }

    updateStartingHours = () => {
        this.room.updateStartingHours(this.examStartingHours, this.examStartingHourOffset, this.roomIds).then(() => {
            if (this.startingHours) {
                this.startingHours = this.examStartingHours;
            }
        });
    };

    toggleAllExamStartingHours = () => {
        const anySelected = this.examStartingHours.some((hours) => {
            return hours.selected;
        });
        this.examStartingHours.forEach((hours) => {
            hours.selected = !anySelected;
        });
    };

    setStartingHourOffset = () => {
        this.examStartingHourOffset = this.examStartingHourOffset || 0;
        this.examStartingHours.forEach((hours) => {
            hours.startingHour = hours.startingHour.split(':')[0] + ':' + this.zeropad(this.examStartingHourOffset);
        });
    };

    anyStartingHoursSelected = () => this.examStartingHours.some((hours) => hours.selected);

    private zeropad = (n: number) => (String(n).length > 1 ? n : '0' + n);
}
