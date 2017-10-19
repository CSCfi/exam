'use strict';
angular.module('app.enrolment')
    .service('WrongLocation', ['$timeout', '$translate', function ($timeout, $translate) {

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
                    toastr.warning(t.sitnet_your_exam_will_start_at + ' ' + startsAt.format('HH:mm') + ' ' +
                        t.sitnet_at_location + ': ' + data[0] + ', ' + data[1] + ' ' +
                        t.sitnet_at_room + ' ' + data[2] + ' ' +
                        t.sitnet_at_machine + ' ' + data[3], opts);
                });
            } else {
                parts = ['sitnet_you_have_ongoing_exam_at_location', 'sitnet_at_room', 'sitnet_at_machine'];
                $translate(parts).then(function (t) {
                    toastr.error(t.sitnet_you_have_ongoing_exam_at_location + ': ' + data[0] + ', ' + data[1] + ' ' +
                        t.sitnet_at_room + ' ' + data[2] + ' ' +
                        t.sitnet_at_machine + ' ' + data[3], opts);
                });
            }
        };

    }]);

