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
angular.module('app.enrolment')
    .service('WrongLocation', ['$timeout', '$translate', 'toast', function ($timeout, $translate, toast) {

        var self = this;

        self.display = function (data) {

            var opts = {
                timeOut: 10000
            };
            var startsAt = moment(data[4]);
            var now = moment();
            if (now.isDST()) {
                startsAt.add(-1, 'hour');
            }
            var parts;
            if (startsAt.isAfter(now)) {
                parts = ['sitnet_your_exam_will_start_at', 'sitnet_at_location', 'sitnet_at_room', 'sitnet_at_machine'];
                $translate(parts).then(function (t) {
                    toast.warning(t.sitnet_your_exam_will_start_at + ' ' + startsAt.format('HH:mm') + ' ' +
                        t.sitnet_at_location + ': ' + data[0] + ', ' + data[1] + ' ' +
                        t.sitnet_at_room + ' ' + data[2] + ' ' +
                        t.sitnet_at_machine + ' ' + data[3], opts);
                });
            } else {
                parts = ['sitnet_you_have_ongoing_exam_at_location', 'sitnet_at_room', 'sitnet_at_machine'];
                $translate(parts).then(function (t) {
                    toast.error(t.sitnet_you_have_ongoing_exam_at_location + ': ' + data[0] + ', ' + data[1] + ' ' +
                        t.sitnet_at_room + ' ' + data[2] + ' ' +
                        t.sitnet_at_machine + ' ' + data[3], opts);
                });
            }
        };

    }]);

