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
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild,
    signal,
} from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventApi, EventClickArg, EventInput } from '@fullcalendar/core';
import enLocale from '@fullcalendar/core/locales/en-gb';
import fiLocale from '@fullcalendar/core/locales/fi';
import svLocale from '@fullcalendar/core/locales/sv';
import luxon2Plugin from '@fullcalendar/luxon2';
import timeGridPlugin from '@fullcalendar/timegrid';
import { TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { Accessibility, ExamRoom } from 'src/app/reservation/reservation.model';
import { CalendarService } from './calendar.service';

@Component({
    selector: 'xm-booking-calendar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible) {
            <div>
                <div class="row mt-2 mb-2" id="calendarBlock">
                    @if (visible) {
                        <div class="col-md-12">
                            <full-calendar #fc [options]="calendarOptions()"></full-calendar>
                        </div>
                    }
                </div>
            </div>
        }
    `,
    standalone: true,
    imports: [FullCalendarModule],
})
export class BookingCalendarComponent implements OnInit, OnChanges, AfterViewInit {
    @Output() eventSelected = new EventEmitter<EventApi>();
    @Output() moreEventsNeeded = new EventEmitter<{
        date: string;
        timeZone: string;
        success: (events: EventInput[]) => void;
    }>();

    @Input() visible = false;
    @Input() minDate?: Date;
    @Input() maxDate?: Date;
    @Input() room!: ExamRoom;
    @Input() accessibilities: Accessibility[] = [];

    @ViewChild('fc') calendar!: FullCalendarComponent;

    calendarOptions = signal<CalendarOptions>({});
    searchStart = DateTime.now().startOf('week').toISO();
    searchEnd = DateTime.now().endOf('week').toISO();

    constructor(
        private translate: TranslateService,
        private Calendar: CalendarService,
    ) {
        this.calendarOptions.set({
            plugins: [luxon2Plugin, timeGridPlugin],
            initialView: 'timeGridWeek',
            firstDay: 1,
            dayHeaderFormat: 'EEEE d.L',
            locale: this.translate.currentLang,
            locales: [fiLocale, svLocale, enLocale],
            allDaySlot: false,
            height: 'auto',
            nowIndicator: true,
            slotLabelFormat: { hour: 'numeric', minute: '2-digit', hour12: false },
            eventMinHeight: 45,
            events: this.refetch,
            eventClick: this.eventClicked.bind(this),
        });
        this.translate.onLangChange.subscribe((event) =>
            this.calendarOptions.set({ ...this.calendarOptions(), locale: event.lang }),
        );
    }

    ngOnInit() {
        if (this.minDate && this.maxDate) {
            this.calendarOptions().validRange = {
                end: DateTime.fromJSDate(this.maxDate).endOf('week').plus({ hours: 1 }).toFormat('yyyy-MM-dd'),
                start: DateTime.fromJSDate(this.minDate).startOf('week').toFormat('yyyy-MM-dd'),
            };
        }
    }

    ngAfterViewInit() {
        if (!this.minDate) {
            this.calendar.getApi().render(); // TODO: see if needed
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.room && this.room) {
            const earliestOpening = this.Calendar.getEarliestOpening(this.room, this.searchStart, this.searchEnd);
            const minTime =
                earliestOpening.getHours() > 1
                    ? DateTime.fromJSDate(earliestOpening).minus({ hour: 1 }).toJSDate()
                    : earliestOpening;
            const latestClosing = this.Calendar.getLatestClosing(this.room, this.searchStart, this.searchEnd);
            const maxTime =
                latestClosing.getHours() < 23
                    ? DateTime.fromJSDate(latestClosing).plus({ hour: 1 }).toJSDate()
                    : latestClosing;
            this.calendarOptions.update((cos) => ({
                ...cos,
                hiddenDays: this.Calendar.getClosedWeekdays(this.room, this.searchStart, this.searchEnd),
                slotMinTime: DateTime.fromJSDate(minTime).toFormat('HH:mm:ss'),
                slotMaxTime: DateTime.fromJSDate(maxTime).toFormat('HH:mm:ss'),
                timeZone: this.room.localTimezone,
            }));
            if (this.calendar) this.calendar.getApi().refetchEvents();
        }
        if (changes.accessibilities && this.calendar) {
            this.calendar.getApi().refetchEvents();
        }
    }

    refetch = (input: { startStr: string; timeZone: string }, success: (events: EventInput[]) => void) => {
        this.searchStart = input.startStr;
        this.searchEnd = DateTime.fromISO(input.startStr).endOf('week').toISO() as string;
        const hidden = this.Calendar.getClosedWeekdays(this.room, this.searchStart, this.searchEnd);
        const earliestOpening = this.Calendar.getEarliestOpening(this.room, this.searchStart, this.searchEnd);
        const latestClosing = this.Calendar.getLatestClosing(this.room, this.searchStart, this.searchEnd);
        this.calendarOptions.update((cos) => ({
            ...cos,
            hiddenDays: hidden,
            slotMinTime: DateTime.fromJSDate(earliestOpening).toFormat('HH:mm:ss'),
            slotMaxTime: DateTime.fromJSDate(latestClosing).toFormat('HH:mm:ss'),
        }));

        this.moreEventsNeeded.emit({ date: input.startStr, timeZone: input.timeZone, success: success });
    };

    eventClicked(arg: EventClickArg): void {
        if (arg.event.extendedProps?.availableMachines > 0) {
            this.eventSelected.emit(arg.event);
        }
    }
}
