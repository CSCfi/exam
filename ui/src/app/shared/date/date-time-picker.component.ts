// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTimepicker } from '@ng-bootstrap/ng-bootstrap';
import { DatePickerComponent } from './date-picker.component';

@Component({
    selector: 'xm-date-time-picker',
    template: `
        <div class="row align-items-center">
            <div class="col-auto" [ngClass]="disableDate() ? 'disable-gray-out' : ''">
                <xm-date-picker
                    [disabled]="disabled()"
                    [initialDate]="initialTime()"
                    [readonly]="readonly()"
                    (updated)="onDateUpdate($event)"
                    [minDate]="minDate()"
                    [maxDate]="maxDate()"
                ></xm-date-picker>
            </div>
            <div class="col" [ngClass]="disableTime() ? 'disable-gray-out' : ''">
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
    imports: [NgClass, DatePickerComponent, NgbTimepicker, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateTimePickerComponent {
    initialTime = input<Date | null>(null);
    hourStep = input(0);
    minuteStep = input(0);
    disabled = input(false);
    readonly = input(false);
    minDate = input(new Date().toISOString());
    maxDate = input<string | undefined>(undefined);
    disableDate = input(false);
    disableTime = input(false);

    updated = output<{ date: Date }>();

    date = signal<Date>(new Date());
    time = signal<{ hour: number; minute: number; second: number; millisecond?: number }>({
        hour: new Date().getHours(),
        minute: new Date().getMinutes(),
        second: new Date().getSeconds(),
    });

    constructor() {
        const now = new Date();
        this.time.set({ hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() });

        // Effect to react to initialTime changes
        effect(() => {
            const initialTimeValue = this.initialTime();
            if (initialTimeValue) {
                this.setDateTime(initialTimeValue);
            }
        });
    }

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

    private setDateTime(dt: Date) {
        const newDate = new Date(dt);
        this.date.set(newDate);
        this.time.set({
            hour: dt.getHours(),
            minute: dt.getMinutes(),
            second: 0,
            millisecond: 0,
        });
    }
}
