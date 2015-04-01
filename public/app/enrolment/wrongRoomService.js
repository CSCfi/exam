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

                var startsAt = moment(data[4]);
                var now = moment();
                if (now.isDST()) {
                    startsAt.add(-1, 'hour');
                }
                if (startsAt.isAfter(now)) {
                    toastr.warning('Sinulla on koe alkamassa klo ' + startsAt.format('HH:mm') +
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
