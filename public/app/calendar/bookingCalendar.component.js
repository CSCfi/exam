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
        }, controller: ['$translate', 'Calendar',
            function ($translate, Calendar) {

                var vm = this;

                vm.$onInit = function () {
                    vm.eventSources = [];

                    var selectedEvent;
                    vm.calendarConfig = {
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
                                text: moment().format('MMMM YYYY'),
                                click: function () {

                                }
                            }
                        },
                        events: function (start, end, timezone, callback) {
                            Calendar.renderCalendarTitle();
                            vm.onRefresh({start: start, callback: callback});
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

                            var today = moment();

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
