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
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { CalendarOptions, EventApi, EventClickArg, EventInput, FullCalendarComponent } from '@fullcalendar/angular';
import enLocale from '@fullcalendar/core/locales/en-gb';
import fiLocale from '@fullcalendar/core/locales/fi';
import svLocale from '@fullcalendar/core/locales/sv';
import { TranslateService } from '@ngx-translate/core';
import { addHours, endOfWeek, format, startOfWeek } from 'date-fns';
import type { Accessibility, ExamRoom } from '../reservation/reservation.model';
import { CalendarService } from './calendar.service';

@Component({
    selector: 'xm-booking-calendar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './booking-calendar.component.html',
})
export class BookingCalendarComponent implements OnInit, OnChanges {
    @Output() eventSelected = new EventEmitter<EventApi>();
    @Output() moreEventsNeeded = new EventEmitter<{
        date: Date;
        success: (events: EventInput[]) => void;
    }>();

    @Input() visible = false;
    @Input() minDate?: Date;
    @Input() maxDate?: Date;
    @Input() room!: ExamRoom;
    @Input() accessibilities: Accessibility[] = [];

    @ViewChild('fc') calendar!: FullCalendarComponent;

    calendarOptions: CalendarOptions;
    clickedEvent?: EventClickArg;

    constructor(private translate: TranslateService, private Calendar: CalendarService) {
        this.calendarOptions = {
            initialView: 'timeGridWeek',
            timeZone: 'Europe/Helsinki',
            firstDay: 1,
            dayHeaderFormat: { weekday: 'short', day: 'numeric', month: 'numeric', separator: '.' },
            locale: this.translate.currentLang,
            locales: [fiLocale, svLocale, enLocale],
            allDaySlot: false,
            height: 'auto',
            nowIndicator: true,
            eventMinHeight: 45,
            events: this.refetch,
            eventClick: this.eventClicked.bind(this),
        };
        this.translate.onLangChange.subscribe((event) => {
            this.calendarOptions = { ...this.calendarOptions, locale: event.lang };
            //this.calendar.getApi().destroy();
            //this.calendar.getApi().render();
        });
    }

    ngOnInit() {
        if (!this.minDate) {
            this.calendar.getApi().render(); // TODO: see if needed
        }
        if (this.minDate && this.maxDate) {
            this.calendarOptions.validRange = {
                end: format(endOfWeek(this.maxDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                start: format(startOfWeek(this.minDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
            };
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.room && this.room) {
            const earliestOpening = this.Calendar.getEarliestOpening(this.room);
            const minTime = earliestOpening.getHours() > 1 ? addHours(earliestOpening, -1) : earliestOpening;
            const latestClosing = this.Calendar.getLatestClosing(this.room);
            const maxTime = latestClosing.getHours() < 23 ? addHours(latestClosing, 1) : latestClosing;
            this.calendarOptions.hiddenDays = this.Calendar.getClosedWeekdays(this.room);
            this.calendarOptions.slotMinTime = format(minTime, 'HH:mm');
            this.calendarOptions.slotMaxTime = format(maxTime, 'HH:mm');
            this.calendarOptions.timeZone = this.room.localTimezone;
            if (this.calendar) this.calendar.getApi().refetchEvents();
        }
        if (changes.accessibilities && this.calendar) {
            this.calendar.getApi().refetchEvents();
        }
    }
    refetch = (input: { start: Date }, success: (events: EventInput[]) => void) =>
        this.moreEventsNeeded.emit({ date: input.start, success: success });

    eventClicked(arg: EventClickArg): void {
        if (arg.event.extendedProps?.availableMachines > 0) {
            if (!this.clickedEvent) {
                this.clickedEvent = arg;
            } else if (arg.event.id !== this.clickedEvent.event.id) {
                //this.clickedEvent.color = { primary: '#add2eb', secondary: '#a6e9b2' };
                this.clickedEvent = arg;
            }
            this.eventSelected.emit(arg.event);
        }
    }
}
