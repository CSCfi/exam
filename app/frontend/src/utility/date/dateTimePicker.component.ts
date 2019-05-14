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
import { Component, Output, Input, EventEmitter } from '@angular/core';

interface Time {
    hour: number;
    minute: number;
}

@Component({
    selector: 'date-time-picker',
    template: `
    <div>
        <div id="datetimepicker" class="datetimepicker-wrapper">
            <date-picker (onUpdate)="onDateUpdate($event)"></date-picker>
        </div>
        <div id="datetimepicker" class="datetimepicker-wrapper" style="display:inline-block">
            <ngb-timepicker [(ngModel)]="time" (ngModelChange)="onTimeUpdate($event)"
                [minuteStep]="minuteStep" [hourStep]="hourStep"></ngb-timepicker>
        </div>
    </div>
    `
})
export class DateTimePickerComponent {

    @Input() hourStep: number;
    @Input() minuteStep: number;
    @Output() onUpdate = new EventEmitter<{ date: Date }>();

    date: Date = new Date();
    time: Time;

    onTimeUpdate($event: Time) {
        this.date.setHours(this.time.hour);
        this.date.setMinutes(this.time.minute);
        this.date.setSeconds(0);
        this.date.setMilliseconds(0);
        this.onUpdate.emit({ date: this.date });
    }

    onDateUpdate($event: { date: Date }) {
        this.date.setFullYear(this.date.getFullYear());
        this.date.setMonth(this.date.getMonth());
        this.date.setDate(this.date.getDate());
        this.date.setHours(this.time.hour);
        this.date.setMinutes(this.time.minute);
        this.date.setSeconds(0);
        this.date.setMilliseconds(0);
        this.onUpdate.emit({ date: this.date });
    }
}

