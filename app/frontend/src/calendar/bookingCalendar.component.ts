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
import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { OptionsInput } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import { TranslateService } from '@ngx-translate/core';

import { CalendarService } from './calendar.service';

declare let $: any;

@Component({
    selector: 'booking-calendar',
    template: require('./bookingCalendar.component.html'),
})
export class BookingCalendarComponent implements OnInit {
    @Output() onRefresh = new EventEmitter<{ start: Date; callback: (events: unknown[]) => unknown }>();
    @Output() onEventSelected = new EventEmitter<{ start: Date; end: Date }>();
    @Output() onViewAvailable = new EventEmitter<{ start: Date; end: Date }>();
    @Input() visible: boolean;
    @Input() isExternal: boolean;
    @Input() minDate: Date;
    @Input() maxDate: Date;

    @ViewChild('bookingCalendar') bookingCalendar: FullCalendarComponent;

    options: OptionsInput;
    defaultDate: Date;
    plugins = [timeGridPlugin];
    eventSources: unknown[] = [];

    constructor(private translate: TranslateService, private Calendar: CalendarService) {}

    fetchEvents = (info: { start: Date; end: Date }, callback: (_: unknown) => unknown) => {
        console.log('fetching events');
        this.onRefresh.emit({ start: info.start, callback: callback });
    };

    ngOnInit(): void {
        this.defaultDate = new Date();
        this.options = {
            locale: this.translate.currentLang,
            defaultDate: this.defaultDate,
            editable: false,
            selectable: false,
            defaultView: 'timeGridWeek',
            allDaySlot: false,
            weekNumbers: false,
            firstDay: 1,
            slotEventOverlap: false,
            eventClick: data => {
                console.log('event clicked ' + data.event.id);
                if (data.event.extendedProps.availableMachines > 0) {
                    this.onEventSelected.emit({ start: data.event.start as Date, end: data.event.end as Date });
                    data.event.setExtendedProp('selected', !data.event.extendedProps.selected);
                    data.event.setProp('backgroundColor', '#92C3E4');
                }
            },
        };
    }

    ngOnChanges(props: SimpleChanges) {
        if (this.minDate && this.bookingCalendar) {
            this.bookingCalendar.getApi().gotoDate(this.minDate);
        }
        if (props.room && props.room.currentValue) {
            console.log('room changed');
            const room = props.room.currentValue;
            const earliestOpening = this.Calendar.getEarliestOpening(room);
            const minTime = earliestOpening.hours() > 1 ? earliestOpening.add(-1, 'hours') : earliestOpening;
            const latestClosing = this.Calendar.getLatestClosing(room);
            const maxTime = latestClosing.hours() < 23 ? latestClosing.add(1, 'hours') : latestClosing;
            const hiddenDays = this.Calendar.getClosedWeekdays(room);

            Object.assign(this.options, {
                timezone: room.localTimezone,
                minTime: minTime.format('HH:mm:ss'),
                maxTime: maxTime.format('HH:mm:ss'),
                scrollTime: minTime.format('HH:mm:ss'),
                hiddenDays: hiddenDays,
                height: 'auto',
            });
            // this.bookingCalendar.getApi().refetchEvents();
        }
    }
}
