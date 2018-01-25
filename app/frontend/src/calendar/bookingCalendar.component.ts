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

import * as angular from 'angular';
import * as moment from 'moment';
import * as fullCalendar from 'fullcalendar';
import { CalendarService, Room } from './calendar.service';

import 'fullcalendar/dist/fullcalendar.min.css';

export const BookingCalendarComponent: angular.IComponentOptions = {
    template:
        `<div id="calendarBlock" style="display: none;">
            <div class="col-md-12 calendar-no-paddings" id="calendar" config="$ctrl.calendarConfig"
                    ng-model="$ctrl.eventSources"
                    ui-calendar="$ctrl.calendarConfig" calendar="myCalendar">
            </div>
        </div>`,
    bindings: {
        'onRefresh': '&',
        'onEventSelected': '&',
        'room': '<',
        'minDate': '<',
        'maxDate': '<'
    },
    controller: class BookingCalendarController implements angular.IComponentController {

        onRefresh: (_: { start: string, callback: () => void }) => void;
        onEventSelected: (_: { start: string, end: string }) => void;
        room: Room;
        minDate: moment.Moment;
        maxDate: moment.Moment;
        eventSources: any[] = [];
        calendarConfig: any;

        /* @ngInject */
        constructor(
            private $translate: angular.translate.ITranslateService,
            private Calendar: CalendarService
        ) { }

        $onInit() {
            const self = this;
            let selectedEvent;
            this.calendarConfig = {
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
                header: {
                    left: 'myCustomButton',
                    center: 'prev title next',
                    right: 'today'
                },
                customButtons: {
                    myCustomButton: {
                        text: moment().format('MMMM YYYY'),
                        click: function () {

                        }
                    }
                },
                events: (start, end, timezone, callback: () => void) => {
                    this.Calendar.renderCalendarTitle();
                    this.onRefresh({ start: start, callback: callback });
                },
                eventClick: function (event) {
                    if (event.availableMachines > 0) {
                        self.onEventSelected({ start: event.start, end: event.end });
                        if (selectedEvent) {
                            $(selectedEvent).css('background-color', '#A6E9B2');
                        }
                        event.selected = !event.selected;
                        selectedEvent = $(this);
                        $(this).css('background-color', '#266B99');
                    }
                },
                eventMouseover: function (event, jsEvent, view) {
                    if (!event.selected && event.availableMachines > 0) {
                        $(this).css('cursor', 'pointer');
                        $(this).css('background-color', '#3CA34F');
                    }
                },
                eventMouseout: function (event, jsEvent, view) {
                    if (!event.selected && event.availableMachines > 0) {
                        $(this).css('background-color', '#A6E9B2');
                    }
                },
                eventRender: (event, element, view) => {
                    if (event.availableMachines > 0) {
                        element.attr('title', this.$translate.instant('sitnet_new_reservation') + ' ' +
                            event.start.format('HH:mm') + ' - ' + event.end.format('HH:mm'));
                    }
                },
                eventAfterAllRender: (view) => {
                    // Disable next/prev buttons if date range is off limits
                    const prevButton = $('.fc-prev-button');
                    const nextButton = $('.fc-next-button');
                    const todayButton = $('.fc-today-button');

                    const today = moment();

                    if (this.minDate >= view.start && this.minDate <= view.end) {
                        prevButton.prop('disabled', true);
                        prevButton.addClass('fc-state-disabled');
                    } else {
                        prevButton.removeClass('fc-state-disabled');
                        prevButton.prop('disabled', false);
                    }
                    if (this.maxDate >= view.start && this.maxDate <= view.end) {
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
                }
            };
        }

        $onChanges(props: angular.IOnChangesObject) {
            if (this.minDate) {
                $('#calendar').fullCalendar('gotoDate', this.minDate);
            }
            if (props.room && props.room.currentValue) {
                const room = props.room.currentValue;
                const minTime = this.Calendar.getEarliestOpening(room);
                const maxTime = this.Calendar.getLatestClosing(room);
                const hiddenDays = this.Calendar.getClosedWeekdays(room);
                $('#calendar').fullCalendar(
                    $.extend(this.calendarConfig, {
                        timezone: room.localTimezone,
                        minTime: minTime.format('HH:mm:ss'),
                        maxTime: maxTime.format('HH:mm:ss'),
                        scrollTime: minTime.format('HH:mm:ss'),
                        hiddenDays: hiddenDays,
                        height: 'auto'
                    })
                );
            }
        }

    }
};
