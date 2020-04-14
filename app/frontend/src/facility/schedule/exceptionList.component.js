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

import angular from 'angular';
import moment from 'moment';

angular.module('app.facility.schedule').component('exceptionList', {
    template: require('./exceptionList.template.html'),
    bindings: {
        room: '<',
        hideButton: '<',
        hideTitle: '<',
        filter: '<',
        onCreate: '&',
        onDelete: '&',
    },
    controller: [
        'Room',
        function(Room) {
            const vm = this;

            vm.formatDate = function(exception) {
                const fmt = 'DD.MM.YYYY HH:mm';
                const start = moment(exception.startDate);
                const end = moment(exception.endDate);
                return start.format(fmt) + ' - ' + end.format(fmt);
            };

            vm.addException = function() {
                Room.openExceptionDialog(vm.onCreate);
            };

            vm.deleteException = function(exception) {
                vm.onDelete({ exception: exception });
            };
        },
    ],
});
