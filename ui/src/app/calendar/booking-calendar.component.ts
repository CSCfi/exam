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
import type { OnChanges, SimpleChanges } from '@angular/core';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type { CalendarEvent } from 'angular-calendar';
import { CalendarDateFormatter, CalendarView, DAYS_OF_WEEK } from 'angular-calendar';
import { addHours, addWeeks, endOfWeek, startOfWeek, subWeeks } from 'date-fns';
import type { ExamRoom } from '../reservation/reservation.model';
import { DateFormatter } from './booking-calendar-date-formatter';
import { CalendarService } from './calendar.service';

export type SlotMeta = { availableMachines: number };

@Component({
    selector: 'xm-booking-calendar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './booking-calendar.component.html',
    providers: [{ provide: CalendarDateFormatter, useClass: DateFormatter }],
})
export class BookingCalendarComponent implements OnInit, OnChanges {
    @Output() eventSelected = new EventEmitter<CalendarEvent>();
    @Output() moreEventsNeeded = new EventEmitter<{ date: Date }>();

    @Input() events: CalendarEvent<SlotMeta>[] = [];
    @Input() visible = false;
    @Input() minDate?: Date;
    @Input() maxDate?: Date;
    @Input() room!: ExamRoom;

    view: CalendarView = CalendarView.Week;
    minHour = 0;
    maxHour = 23;

    locale: string;
    weekStartsOn: number = DAYS_OF_WEEK.MONDAY;
    hiddenDays: number[] = [];
    activeDayIsOpen = false;
    viewDate: Date = new Date();
    clickedEvent?: CalendarEvent<SlotMeta>;

    nextWeekDisabled = false;
    prevWeekDisabled = true;

    constructor(private translate: TranslateService, private Calendar: CalendarService) {
        this.locale = this.translate.currentLang;
    }

    today = () => this.changeDate(new Date());
    nextWeek = () => this.changeDate(addWeeks(this.viewDate, 1));
    prevWeek = () => this.changeDate(subWeeks(this.viewDate, 1));

    ngOnInit() {
        if (!this.minDate) {
            this.prevWeekDisabled = false;
            this.refetch(); // TODO: how else to trigger initial search for availibility view
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.room && this.room) {
            const earliestOpening = this.Calendar.getEarliestOpening(this.room);
            const minTime = earliestOpening.getHours() > 1 ? addHours(earliestOpening, -1) : earliestOpening;
            const latestClosing = this.Calendar.getLatestClosing(this.room);
            const maxTime = latestClosing.getHours() < 23 ? addHours(latestClosing, 1) : latestClosing;
            this.hiddenDays = this.Calendar.getClosedWeekdays(this.room);
            [this.minHour, this.maxHour] = [minTime.getHours(), maxTime.getHours()];
        }
    }

    refetch = () => this.moreEventsNeeded.emit({ date: this.viewDate });

    eventClicked(event: CalendarEvent<SlotMeta>): void {
        if (event.meta && event.meta.availableMachines > 0) {
            event.color = { primary: '#a6e9b2', secondary: '#add2eb' };
            if (!this.clickedEvent) {
                this.clickedEvent = event;
            } else if (event.id !== this.clickedEvent.id) {
                this.clickedEvent.color = { primary: '#add2eb', secondary: '#a6e9b2' };
                this.clickedEvent = event;
            }
            this.eventSelected.emit(event);
        }
    }

    private nextWeekValid = (date: Date): boolean =>
        !this.maxDate || this.maxDate > startOfWeek(addWeeks(date, 1), { weekStartsOn: DAYS_OF_WEEK.MONDAY });
    private prevWeekValid = (date: Date): boolean =>
        !this.minDate || this.minDate < endOfWeek(subWeeks(date, 1), { weekStartsOn: DAYS_OF_WEEK.MONDAY });

    private changeDate(date: Date): void {
        this.viewDate = date;
        this.dateChanged();
    }

    private dateChanged() {
        this.prevWeekDisabled = !this.prevWeekValid(this.viewDate);
        this.nextWeekDisabled = !this.nextWeekValid(this.viewDate);
        if (this.minDate && this.viewDate < this.minDate) {
            this.changeDate(this.minDate);
        } else if (this.maxDate && this.viewDate > this.maxDate) {
            this.changeDate(this.maxDate);
        }
    }
}
