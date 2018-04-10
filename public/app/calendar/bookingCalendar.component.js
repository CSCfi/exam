/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

'use strict';
angular.module('app.calendar')
    .component('bookingCalendar', {
        template: '<div id="calendarBlock" style="display:none">\n' +
        '                <div class="col-md-12 calendar-no-paddings" id="calendar" config="$ctrl.calendarConfig"\n' +
        '                     ng-model="$ctrl.eventSources"\n' +
        '                     ui-calendar="$ctrl.calendarConfig" calendar="myCalendar">\n' +
        '               </div>\n' +
        '            </div>',
        bindings: {
            'onRefresh': '&',
            'onEventSelected': '&',
            'room': '<',
            'minDate': '<',
            'maxDate': '<'
        }, controller: ['$translate', 'Calendar', '$rootScope', 'lodash',
            function ($translate, Calendar, $rootScope, lodash) {

                var vm = this;

                vm.$onInit = function () {
                    vm.eventSources = [];

                    vm.defaultDate = moment();

                    var selectedEvent;
                    vm.calendarConfig = {
                        lang: $translate.use(),
                        defaultDate: vm.defaultDate,
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
                            today: $translate.instant('sitnet_today')
                        },
                        header: {
                            left: 'myCustomButton',
                            center: 'prev title next',
                            right: 'today'
                        },
                        customButtons: {
                            myCustomButton: {
                                text: lodash.capitalize(moment().locale($translate.use()).format('MMMM YYYY')),
                                click: function () {

                                }
                            }
                        },
                        events: function (start, end, timezone, callback) {
                            Calendar.renderCalendarTitle();
                            vm.onRefresh({start: start, callback: callback});
                        },
                        viewRender: function (view) {
                            vm.defaultDate = view.start;
                        },
                        eventClick: function (event) {
                            //vm.validSelections = false;
                            if (event.availableMachines > 0) {
                                vm.onEventSelected({start: event.start, end: event.end});
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
                        eventRender: function (event, element, view) {
                            if (event.availableMachines > 0) {
                                element.attr('title', $translate.instant('sitnet_new_reservation') + ' ' +
                                    event.start.format('HH:mm') + ' - ' + event.end.format('HH:mm'));
                            }
                        },
                        eventAfterAllRender: function (view) {
                            // Disable next/prev buttons if date range is off limits
                            var prevButton = $('.fc-prev-button');
                            var nextButton = $('.fc-next-button');
                            var todayButton = $('.fc-today-button');
                            var customButton = $('.fc-myCustomButton-button');

                            var today = moment();

                            customButton.text(
                                lodash.capitalize(view.start.locale($translate.use()).format('MMMM YYYY'))
                            );

                            if (vm.minDate >= view.start && vm.minDate <= view.end) {
                                prevButton.prop('disabled', true);
                                prevButton.addClass('fc-state-disabled');
                            }
                            else {
                                prevButton.removeClass('fc-state-disabled');
                                prevButton.prop('disabled', false);
                            }
                            if (vm.maxDate >= view.start && vm.maxDate <= view.end) {
                                nextButton.prop('disabled', true);
                                nextButton.addClass('fc-state-disabled');
                            } else {
                                nextButton.removeClass('fc-state-disabled');
                                nextButton.prop('disabled', false);
                            }
                            if (today < vm.minDate) {
                                todayButton.prop('disabled', true);
                                todayButton.addClass('fc-state-disabled');
                            } else {
                                todayButton.removeClass('fc-state-disabled');
                                todayButton.prop('disabled', false);
                            }
                        }
                    };
                };

                $rootScope.$on('$translateChangeSuccess', function () {
                    vm.calendarConfig.buttonText.today = $translate.instant('sitnet_today');
                    vm.calendarConfig.customButtons.myCustomButton.text = lodash.capitalize(
                        moment().locale($translate.use()).format('MMMM YYYY')
                    );
                    vm.calendarConfig.lang = $translate.use();
                    vm.calendarConfig.defaultDate = vm.defaultDate;
                });

                vm.$onChanges = function (props) {
                    if (props.room && props.room.currentValue) {
                        var room = props.room.currentValue;
                        var minTime = Calendar.getEarliestOpening(room);
                        var maxTime = Calendar.getLatestClosing(room);
                        var hiddenDays = Calendar.getClosedWeekdays(room);
                        $('#calendar').fullCalendar(
                            $.extend(vm.calendarConfig, {
                                timezone: room.localTimezone,
                                minTime: minTime,
                                maxTime: maxTime,
                                scrollTime: minTime,
                                hiddenDays: hiddenDays,
                                height: 'auto'
                            })
                        );
                    }
                };
            }]
    });
