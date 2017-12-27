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

'use strict';
angular.module('app.facility.schedule')
    .component('exceptionList', {
        templateUrl: '/assets/app/facility/schedule/exceptionList.template.html',
        bindings: {
            room: '<',
            hideButton: '<',
            hideTitle: '<',
            filter: '<',
            onCreate: '&',
            onDelete: '&'
        },
        controller: ['Room',
            function (Room) {

                var vm = this;

                vm.$onInit = function () {
                };

                vm.formatDate = function (exception) {
                    var fmt = 'DD.MM.YYYY HH:mm';
                    var start = moment(exception.startDate);
                    var end = moment(exception.endDate);
                    return start.format(fmt) + ' - ' + end.format(fmt);
                };

                vm.addException = function () {
                    Room.openExceptionDialog(vm.onCreate);
                };

                vm.deleteException = function (exception) {
                    vm.onDelete({exception: exception});
                };
            }]
    });