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
                var startsAt = Date.parse(data[4] + "+02:00");
                if (startsAt > new Date().getTime()) {
                    var date = new Date(startsAt);
                    var hours = zeropad(date.getHours());
                    var mins = zeropad(date.getMinutes());
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
