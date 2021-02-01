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
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CalendarDateFormatter, CalendarView, DAYS_OF_WEEK } from 'angular-calendar';
import { addWeeks, endOfWeek, startOfWeek, subWeeks } from 'date-fns';

import { ExamRoom } from '../reservation/reservation.model';
import { DateFormatter } from './bookingCalendarDateFormatter';
import { CalendarService } from './calendar.service';

import type { OnChanges, SimpleChanges } from '@angular/core';
import type { CalendarEvent } from 'angular-calendar';
export type SlotMeta = { availableMachines: number };

@Component({
    selector: 'booking-calendar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './bookingCalendar.component.html',
    providers: [{ provide: CalendarDateFormatter, useClass: DateFormatter }],
})
export class BookingCalendarComponent implements OnChanges {
    @Output() onEventSelected = new EventEmitter<CalendarEvent>();
    @Output() onNeedMoreEvents = new EventEmitter<{ date: Date }>();

    @Input() events: CalendarEvent<SlotMeta>[];
    @Input() visible: boolean;
    @Input() minDate: Date;
    @Input() maxDate: Date;
    @Input() room: ExamRoom;
    view: CalendarView = CalendarView.Week;
    minHour: number;
    maxHour: number;

    locale: string;
    weekStartsOn: number = DAYS_OF_WEEK.MONDAY;
    hiddenDays: number[] = [];
    activeDayIsOpen = false;
    viewDate: Date = new Date();
    clickedEvent: CalendarEvent<SlotMeta>;

    nextWeekDisabled = false;
    prevWeekDisabled = true;

    constructor(private translate: TranslateService, private Calendar: CalendarService) {
        this.locale = this.translate.currentLang;
    }

    private nextWeekValid = (date: Date): boolean =>
        this.maxDate > startOfWeek(addWeeks(date, 1), { weekStartsOn: DAYS_OF_WEEK.MONDAY });
    private prevWeekValid = (date: Date): boolean =>
        this.minDate < endOfWeek(subWeeks(date, 1), { weekStartsOn: DAYS_OF_WEEK.MONDAY });

    today = () => this.changeDate(new Date());
    nextWeek = () => this.changeDate(addWeeks(this.viewDate, 1));
    prevWeek = () => this.changeDate(subWeeks(this.viewDate, 1));

    private changeDate(date: Date): void {
        this.viewDate = date;
        this.dateChanged();
    }

    private dateChanged() {
        this.prevWeekDisabled = !this.prevWeekValid(this.viewDate);
        this.nextWeekDisabled = !this.nextWeekValid(this.viewDate);
        if (this.viewDate < this.minDate) {
            this.changeDate(this.minDate);
        } else if (this.viewDate > this.maxDate) {
            this.changeDate(this.maxDate);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.room && this.room) {
            const earliestOpening = this.Calendar.getEarliestOpening(this.room);
            const minTime = earliestOpening.hours() > 1 ? earliestOpening.add(-1, 'hours') : earliestOpening;
            const latestClosing = this.Calendar.getLatestClosing(this.room);
            const maxTime = latestClosing.hours() < 23 ? latestClosing.add(1, 'hours') : latestClosing;
            this.hiddenDays = this.Calendar.getClosedWeekdays(this.room);
            [this.minHour, this.maxHour] = [minTime.hour(), maxTime.hour()];
        }
    }

    refetch = () => this.onNeedMoreEvents.emit({ date: this.viewDate });

    eventClicked(event: CalendarEvent<SlotMeta>): void {
        // todo check the colors
        if (event.meta && event.meta.availableMachines > 0) {
            event.color = { primary: '#a6e9b2', secondary: '#add2eb' };
            if (!this.clickedEvent) {
                this.clickedEvent = event;
            } else if (event.id !== this.clickedEvent.id) {
                this.clickedEvent.color = { primary: '#add2eb', secondary: '#a6e9b2' };
                this.clickedEvent = event;
            }
            this.onEventSelected.emit(event);
        }
    }
}
