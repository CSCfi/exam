(function () {
    'use strict';
    angular.module('sitnet.services')
        .factory('wrongRoomService', ['$timeout', function ($timeout) {

            var time = 1000 * 10;

            var show = false;

            var zeropad = function(n) {
                n += '';
                return n.length > 1 ? n : '0' + n;
            };

            var display = function (data) {
                if (show) {
                    return;
                }

                $timeout(function () {
                    show = false;
                }, time);

                show = true;

                var opts = toastr.options;
                toastr.options = {
                    "showDuration": "0",
                    "hideDuration": "0",
                    "timeOut": time,
                    "extendedTimeOut": "0"
                };

                var startsAt = data[4];
                var offset = 1000 * 60 * new Date().getTimezoneOffset();
                if (startsAt > new Date().getTime()) {
                    var date = moment.utc(startsAt - offset);
                    var hours = zeropad(date.hours());
                    var mins = zeropad(date.minutes());
                    toastr.warning('Sinulla on koe alkamassa klo ' + hours + ':' + mins +
                        ' sijainnissa: ' + data[0] + ', ' + data[1] + ' huoneessa ' + data[2] +
                        ' koneella ' + data[3]);
                } else {
                    var message = 'Sinulla on koe menossa sijainnissa: ' + data[0] + ', ' + data[1] + ' huoneessa ' +
                        data[2] + ' koneella ' + data[3];
                    toastr.error(message);
                }
                toastr.options = opts;
            };

            return {display: display};
        }]);
}());
