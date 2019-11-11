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
import { CalendarDateFormatter, CalendarEvent, DAYS_OF_WEEK } from 'angular-calendar';

import { DateFormatter } from './bookingCalendarDateFormatter';

export type SlotMeta = { availableMachines: number };

@Component({
    selector: 'booking-calendar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: require('./bookingCalendar.component.html'),
    providers: [{ provide: CalendarDateFormatter, useClass: DateFormatter }],
})
export class BookingCalendarComponent {
    @Output() onEventSelected = new EventEmitter<CalendarEvent>();
    @Output() viewDateChange = new EventEmitter<Date>();
    @Output() onNeedMoreEvents = new EventEmitter<{ date: Date }>();

    @Input() events: CalendarEvent<SlotMeta>[];
    @Input() visible: boolean;
    @Input() minDate: Date;
    @Input() maxDate: Date;
    @Input() minHour: number;
    @Input() maxHour: number;

    view = 'week';
    locale: string;
    weekStartsOn: number = DAYS_OF_WEEK.MONDAY;
    hiddenDays: number[] = [];
    activeDayIsOpen = false;
    viewDate: Date = new Date();
    clickedEvent: CalendarEvent<SlotMeta>;

    constructor(private translate: TranslateService) {
        this.locale = this.translate.currentLang;
    }

    refetch() {
        this.onNeedMoreEvents.emit({ date: this.viewDate });
    }

    eventClicked(event: CalendarEvent<SlotMeta>): void {
        // todo check the colors
        if (event.meta && event.meta.availableMachines > 0) {
            event.color = { primary: '#777777', secondary: '#555555' };
            if (!this.clickedEvent) {
                this.clickedEvent = event;
            } else if (event.id !== this.clickedEvent.id) {
                this.clickedEvent.color = { primary: '#e3bc08', secondary: '#FDF1BA' };
                this.clickedEvent = event;
            }
            this.onEventSelected.emit(event);
        }
    }
}
