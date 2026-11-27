// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTimepicker } from '@ng-bootstrap/ng-bootstrap';
import { DatePickerComponent } from './date-picker.component';

@Component({
    selector: 'xm-date-time-picker',
    template: `
        <div class="row align-items-center">
            <div class="col-auto" [class.disable-gray-out]="disableDate()">
                <xm-date-picker
                    [disabled]="disabled()"
                    [initialDate]="initialTime()"
                    [isReadonly]="isReadonly()"
                    (updated)="onDateUpdate($event)"
                    [minDate]="minDate()"
                    [maxDate]="maxDate()"
                ></xm-date-picker>
            </div>
            <div class="col" [class.disable-gray-out]="disableTime()">
                <ngb-timepicker
                    name="timepicker"
                    [disabled]="disabled()"
                    [ngModel]="time()"
                    (ngModelChange)="setTime($event)"
                    [minuteStep]="minuteStep()"
                    [hourStep]="hourStep()"
                ></ngb-timepicker>
            </div>
        </div>
    `,
    styleUrls: ['./date-time-picker.component.scss'],
    imports: [DatePickerComponent, NgbTimepicker, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateTimePickerComponent {
    readonly initialTime = input<Date | null>(null);
    readonly hourStep = input(0);
    readonly minuteStep = input(0);
    readonly disabled = input(false);
    readonly isReadonly = input(false);
    readonly minDate = input(new Date().toISOString());
    readonly maxDate = input<string | undefined>(undefined);
    readonly disableDate = input(false);
    readonly disableTime = input(false);
    readonly updated = output<{ date: Date }>();

    readonly date = linkedSignal<Date>(() => {
        const t = this.initialTime();
        return t ? new Date(t) : new Date();
    });
    readonly time = linkedSignal<{ hour: number; minute: number; second: number; millisecond?: number }>(() => {
        const t = this.initialTime();
        if (t) {
            return { hour: t.getHours(), minute: t.getMinutes(), second: 0, millisecond: 0 };
        }
        const now = new Date();
        return { hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() };
    });

    setTime(value: { hour: number; minute: number; second: number; millisecond?: number }) {
        this.time.set(value);
        this.onTimeUpdate();
    }

    onTimeUpdate() {
        const currentDate = new Date(this.date());
        const currentTime = this.time();
        currentDate.setHours(currentTime.hour);
        currentDate.setMinutes(currentTime.minute);
        currentDate.setSeconds(0);
        currentDate.setMilliseconds(0);
        this.date.set(currentDate);
        this.updated.emit({ date: currentDate });
    }

    onDateUpdate(event: { date: Date | null }) {
        const currentDate = new Date(this.date());
        const currentTime = this.time();
        if (event.date) {
            currentDate.setFullYear(event.date.getFullYear());
            currentDate.setMonth(event.date.getMonth(), event.date.getDate());
            currentDate.setHours(currentTime.hour);
        }
        currentDate.setMinutes(currentTime.minute);
        currentDate.setSeconds(0);
        currentDate.setMilliseconds(0);
        this.date.set(currentDate);
        this.updated.emit({ date: currentDate });
    }
}
