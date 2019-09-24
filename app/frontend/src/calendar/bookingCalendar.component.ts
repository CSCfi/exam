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
import * as fc from 'fullcalendar';
import * as moment from 'moment';
import * as _ from 'lodash';
import { CalendarService, Room } from './calendar.service';

import 'fullcalendar';
import 'fullcalendar/dist/lang/fi';
import 'fullcalendar/dist/lang/sv';
import 'fullcalendar/dist/fullcalendar.min.css';

export const BookingCalendarComponent: angular.IComponentOptions = {
    template:
        `<div id="calendarBlock" style="display: none;">
            <div class="col-md-12 calendar-no-paddings" id="calendar"
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

        onRefresh: (_: { start: string; callback: () => void }) => void;
        onEventSelected: (_: { start: string; end: string }) => void;
        room: Room;
        minDate: moment.Moment;
        maxDate: moment.Moment;
        eventSources: any[] = [];
        defaultDate: moment.Moment;
        calendarConfig: any;

        constructor(
            private $rootScope: angular.IRootScopeService,
            private $translate: angular.translate.ITranslateService,
            private Calendar: CalendarService
        ) {
            'ngInject';
        }

        $onInit() {
            // This this-assignment is ugly but I have no idea how else we can get hold of angular scope from 
            // fullcalendar's jquery context. So disabling linting for it.
            const self = this; // eslint-disable-line
            let selectedEvent;

            this.defaultDate = moment();
            this.$rootScope.$on('$localeChangeSuccess', () => {
                this.calendarConfig.buttonText.today = this.$translate.instant('sitnet_today');
                this.calendarConfig.customButtons.myCustomButton.text = _.capitalize(
                    moment().locale(this.$translate.use()).format('MMMM YYYY')
                );
                this.calendarConfig.lang = this.$translate.use();
                this.calendarConfig.defaultDate = this.defaultDate;
            });
            this.calendarConfig = {
                lang: this.$translate.use(),
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
                    today: this.$translate.instant('sitnet_today')
                },
                header: {
                    left: 'myCustomButton',
                    center: 'prev title next',
                    right: 'today'
                },
                customButtons: {
                    myCustomButton: {
                        text: _.capitalize(moment().locale(this.$translate.use()).format('MMMM YYYY'))
                    }
                },
                events: (start, end, timezone, callback: () => void) => {
                    this.Calendar.renderCalendarTitle();
                    this.onRefresh({ start: start, callback: callback });
                },
                viewRender: (view) => {
                    this.defaultDate = view.start;
                },
                // Have to use old-style function to have 'this' pointing to the DOM element instead of angular context
                eventClick: function (event: fc.EventObject) {
                    if (event.availableMachines > 0) {
                        self.onEventSelected({ start: event.start as string, end: event.end as string });
                        if (selectedEvent) {
                            $(selectedEvent).css('background-color', '#A6E9B2');
                        }
                        event.selected = !event.selected;
                        selectedEvent = $(this);
                        $(this).css('border-color', '#92C3E4');
                        $(this).css('background-color', '#92C3E4');
                    }
                },
                eventMouseover: function (event) {
                    if (!event.selected && event.availableMachines > 0) {
                        $(this).css('cursor', 'pointer');
                        $(this).css('background-color', '#3CA34F');
                    }
                },
                eventMouseout: function (event) {
                    if (!event.selected && event.availableMachines > 0) {
                        $(this).css('background-color', '#A6E9B2');
                    }
                },
                eventRender: (event, element) => {
                    if (event.availableMachines > 0) {
                        element.attr('title', this.$translate.instant('sitnet_new_reservation') + ' ' +
                            event.start.format('HH:mm') + ' - ' + event.end.format('HH:mm'));
                    }
                },
                eventAfterAllRender: (view) => {
                    // Disable next/prev buttons if date range is off limits
                    const prevButton = $('.fc-prev-button');
                    prevButton.attr('aria-label', 'previous week');
                    const nextButton = $('.fc-next-button');
                    nextButton.attr('aria-label', 'next week');
                    const todayButton = $('.fc-today-button');
                    const customButton = $('.fc-myCustomButton-button');

                    const today = moment();

                    customButton.text(
                        _.capitalize(view.start.locale(this.$translate.use()).format('MMMM YYYY'))
                    );

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
                const earliestOpening = this.Calendar.getEarliestOpening(room);
                const minTime = earliestOpening.hours() > 1 ? earliestOpening.add(-1, 'hours') : earliestOpening;
                const latestClosing = this.Calendar.getLatestClosing(room);
                const maxTime = latestClosing.hours() < 23 ? latestClosing.add(1, 'hours') : latestClosing;
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
