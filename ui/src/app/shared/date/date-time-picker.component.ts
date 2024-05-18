// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTimepicker } from '@ng-bootstrap/ng-bootstrap';
import { DatePickerComponent } from './date-picker.component';

@Component({
    selector: 'xm-date-time-picker',
    template: `
        <div class="row align-items-center">
            <div class="col-auto" [ngClass]="disableDate ? 'disable-gray-out' : ''">
                <xm-date-picker
                    [disabled]="disabled"
                    [initialDate]="initialTime"
                    [readonly]="readonly"
                    (updated)="onDateUpdate($event)"
                    [minDate]="minDate"
                    [maxDate]="maxDate"
                ></xm-date-picker>
            </div>
            <div class="col" [ngClass]="disableTime ? 'disable-gray-out' : ''">
                <ngb-timepicker
                    name="timepicker"
                    [disabled]="disabled"
                    [(ngModel)]="time"
                    (ngModelChange)="onTimeUpdate()"
                    [minuteStep]="minuteStep"
                    [hourStep]="hourStep"
                ></ngb-timepicker>
            </div>
        </div>
    `,
    styleUrls: ['./date-time-picker.component.scss'],
    standalone: true,
    imports: [NgClass, DatePickerComponent, NgbTimepicker, FormsModule],
})
export class DateTimePickerComponent implements OnInit, OnChanges {
    @Input() initialTime: Date | null = null;
    @Input() hourStep = 0;
    @Input() minuteStep = 0;
    @Input() disabled = false;
    @Input() readonly = false;
    @Input() minDate = new Date().toISOString();
    @Input() maxDate?: string;
    @Input() disableDate?: boolean = false;
    @Input() disableTime?: boolean = false;
    @Output() updated = new EventEmitter<{ date: Date }>();

    date: Date = new Date();
    time!: { hour: number; minute: number; second: number; millisecond?: number };

    ngOnInit() {
        const now = new Date();
        this.time = { hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() };
        this.date = new Date();
        if (this.initialTime) {
            this.setDateTime(this.initialTime);
        }
    }

    ngOnChanges() {
        const now = new Date();
        this.time = { hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() };
        this.date = new Date();
        if (this.initialTime) {
            this.setDateTime(this.initialTime);
        }
    }

    onTimeUpdate() {
        this.date.setHours(this.time.hour);
        this.date.setMinutes(this.time.minute);
        this.date.setSeconds(0);
        this.date.setMilliseconds(0);
        this.updated.emit({ date: this.date });
    }

    onDateUpdate(event: { date: Date | null }) {
        if (event.date) {
            this.date.setFullYear(event.date.getFullYear());
            this.date.setMonth(event.date.getMonth(), event.date.getDate());
            this.date.setHours(this.time.hour);
        }
        this.date.setMinutes(this.time.minute);
        this.date.setSeconds(0);
        this.date.setMilliseconds(0);
        this.updated.emit({ date: this.date });
    }

    private setDateTime = (dt: Date) => {
        this.date.setFullYear(dt.getFullYear());
        this.date.setMonth(dt.getMonth(), dt.getDate());
        this.time.hour = dt.getHours();
        this.time.minute = dt.getMinutes();
        this.time.second = 0;
        this.time.millisecond = 0;
    };
}
