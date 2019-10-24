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
import { Component, EventEmitter, Inject, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Options } from 'fullcalendar';
import * as _ from 'lodash';
import * as moment from 'moment';
import { CalendarComponent } from 'ng-fullcalendar';
import { CalendarService, Room } from './calendar.service';

declare let $: any;

@Component({
    selector: 'booking-calendar',
    template: `
        <div id="calendarBlock">
            <ng-fullcalendar #bookingCalendar [options]="calendarOptions" id="calendar"></ng-fullcalendar>
        </div>
    `,
})
export class BookingCalendarComponent implements OnInit {
    @Output() onRefresh = new EventEmitter<{ start: moment.Moment; callback: (events: any[]) => void }>();
    @Output() onEventSelected = new EventEmitter<{ start: moment.Moment; end: moment.Moment }>();
    @Input() room: Room;
    @Input() minDate: moment.Moment;
    @Input() maxDate: moment.Moment;

    @ViewChild(CalendarComponent) bookingCalendar: CalendarComponent;

    calendarOptions: Options;
    defaultDate: moment.Moment;

    constructor(
        @Inject('$routeParams') private RouteParams: any,
        private translate: TranslateService,
        private Calendar: CalendarService,
    ) {}

    ngOnInit(): void {
        this.defaultDate = moment();
        let selectedEvent;
        this.calendarOptions = {
            locale: this.translate.currentLang,
            defaultDate: this.defaultDate,
            editable: false,
            selectable: false,
            selectHelper: false,
            defaultView: 'agendaWeek',
            allDaySlot: false,
            weekNumbers: false,
            firstDay: 1,
            timeFormat: 'H:mm',
            columnFormat: 'dd D.M',
            titleFormat: 'D.M.YYYY',
            slotLabelFormat: 'H:mm',
            slotEventOverlap: false,
            buttonText: {
                today: this.translate.instant('sitnet_today'),
            },
            header: {
                left: 'myCustomButton',
                center: 'prev title next',
                right: 'today',
            },
            customButtons: {
                myCustomButton: {
                    text: _.capitalize(
                        moment()
                            .locale(this.translate.currentLang)
                            .format('MMMM YYYY'),
                    ),
                    click: () => {},
                },
            },
            events: (start, end, tz, callback) => {
                this.onRefresh.emit({ start: start, callback: callback });
            },
            viewRender: view => {
                this.defaultDate = moment(view.start);
                // this.Calendar.renderCalendarTitle();
            },
            eventClick: event => {
                if (event.availableMachines > 0) {
                    this.onEventSelected.emit({ start: moment(event.start), end: moment(event.end) });
                    if (selectedEvent) {
                        $(selectedEvent).css('background-color', '#A6E9B2');
                    }
                    event.selected = !event.selected;
                    selectedEvent = $(this);
                    $(this).css('border-color', '#92C3E4');
                    $(this).css('background-color', '#92C3E4');
                }
            },
            eventMouseover: event => {
                if (!event.selected && event.availableMachines > 0) {
                    $(this).css('cursor', 'pointer');
                    $(this).css('background-color', '#3CA34F');
                }
            },
            eventMouseout: event => {
                if (!event.selected && event.availableMachines > 0) {
                    $(this).css('background-color', '#A6E9B2');
                }
            },
            eventRender: (event, element) => {
                if (event.availableMachines > 0) {
                    element.attr(
                        'title',
                        this.translate.instant('sitnet_new_reservation') +
                            ' ' +
                            moment(event.start).format('HH:mm') +
                            ' - ' +
                            moment(event.end).format('HH:mm'),
                    );
                }
            },
            eventAfterAllRender: view => {
                // Disable next/prev buttons if date range is off limits
                const prevButton = $('.fc-prev-button');
                prevButton.attr('aria-label', 'previous week');
                const nextButton = $('.fc-next-button');
                nextButton.attr('aria-label', 'next week');
                const todayButton = $('.fc-today-button');
                const customButton = $('.fc-myCustomButton-button');

                const today = moment();

                customButton.text(
                    _.capitalize(
                        moment(view.start)
                            .locale(this.translate.currentLang)
                            .format('MMMM YYYY'),
                    ),
                );

                if (this.minDate >= view.start && this.minDate <= moment(view.end)) {
                    prevButton.prop('disabled', true);
                    prevButton.addClass('fc-state-disabled');
                } else {
                    prevButton.removeClass('fc-state-disabled');
                    prevButton.prop('disabled', false);
                }
                if (this.maxDate >= view.start && this.maxDate <= moment(view.end)) {
                    nextButton.prop('disabled', true);
                    nextButton.addClass('fc-state-disabled');
                } else {
                    nextButton.removeClass('fc-state-disabled');
                    nextButton.prop('disabled', false);
                }
                if (today < this.minDate) {
                    todayButton.prop('disabled', true);
                    todayButton.addClass('fc-state-disabled');
                } else {
                    todayButton.removeClass('fc-state-disabled');
                    todayButton.prop('disabled', false);
                }
            },
        };
    }

    render() {
        this.bookingCalendar.fullCalendar('destroy');
        this.bookingCalendar.fullCalendar('render');
    }

    ngOnChanges(props: SimpleChanges) {
        if (this.minDate) {
            this.bookingCalendar.fullCalendar('gotoDate', this.minDate);
        }
        if (props.room && props.room.currentValue) {
            const room = props.room.currentValue;
            const earliestOpening = this.Calendar.getEarliestOpening(room);
            const minTime = earliestOpening.hours() > 1 ? earliestOpening.add(-1, 'hours') : earliestOpening;
            const latestClosing = this.Calendar.getLatestClosing(room);
            const maxTime = latestClosing.hours() < 23 ? latestClosing.add(1, 'hours') : latestClosing;
            const hiddenDays = this.Calendar.getClosedWeekdays(room);
            this.bookingCalendar.fullCalendar(
                $.extend(this.calendarOptions, {
                    timezone: room.localTimezone,
                    minTime: minTime.format('HH:mm:ss'),
                    maxTime: maxTime.format('HH:mm:ss'),
                    scrollTime: minTime.format('HH:mm:ss'),
                    hiddenDays: hiddenDays,
                    height: 'auto',
                }),
            );
        }
    }
}
