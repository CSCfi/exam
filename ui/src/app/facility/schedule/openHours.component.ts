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
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { DateTimeService } from '../../utility/date/date.service';
import { RoomService } from '../rooms/room.service';

import type { OnInit } from '@angular/core';
import type { Week } from '../rooms/room.service';

@Component({
    templateUrl: './openHours.component.html',
    selector: 'open-hours',
})
export class OpenHoursComponent implements OnInit {
    @Input() week: Week = {};
    @Output() onSelect = new EventEmitter();

    weekdayNames: string[] = [];
    times: string[] = [];

    constructor(private room: RoomService, private dateTime: DateTimeService, private translate: TranslateService) {}

    ngOnInit() {
        this.translate.onLangChange.subscribe(() => {
            this.weekdayNames = this.dateTime.getWeekdayNames();
        });
        this.weekdayNames = this.dateTime.getWeekdayNames();
        this.times = this.room.getTimes();
    }

    timeRange = () => {
        return [...new Array(this.times.length - 1)].map((x: undefined, i: number) => i);
    };

    getWeekdays = () => {
        return Object.keys(this.week);
    };

    getType = (day: string, time: number) => {
        this.week;
        return this.week[day][time].type;
    };

    calculateTime = (index: number) => {
        return (this.times[index] || '0:00') + ' - ' + this.times[index + 1];
    };

    selectSlot = (day: string, time: number) => {
        const status = this.week[day][time].type;
        if (status === 'accepted') {
            // clear selection
            this.week[day][time].type = '';
            return;
        }
        if (status === 'selected') {
            // mark everything hereafter as free until next block
            for (let i = 0; i < this.week[day].length; ++i) {
                if (i >= time) {
                    if (this.week[day][i].type === 'selected') {
                        this.week[day][i].type = '';
                    } else {
                        break;
                    }
                }
            }
        } else {
            // check if something is accepted yet
            let accepted;
            for (let i = 0; i < this.week[day].length; ++i) {
                if (this.week[day][i].type === 'accepted') {
                    accepted = i;
                    break;
                }
            }
            if (accepted && accepted >= 0) {
                // mark everything between accepted and this as selected
                if (accepted < time) {
                    for (let i = accepted; i <= time; ++i) {
                        this.week[day][i].type = 'selected';
                    }
                } else {
                    for (let i = time; i <= accepted; ++i) {
                        this.week[day][i].type = 'selected';
                    }
                }
            } else {
                this.week[day][time].type = 'accepted'; // mark beginning
            }
        }

        this.onSelect.emit();
    };
}
