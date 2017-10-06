angular.module('app.dashboard.student')
    .service('StudentDashboard', ['$q', '$resource',
        function ($q, $resource) {

            var self = this;

            var enrolmentApi = $resource('/app/enrolments');

            var setOccasion = function (reservation) {
                var machine = reservation.machine;
                var external = reservation.externalReservation;
                var tz = machine ? machine.room.localTimezone : external.roomTz;
                var start = moment.tz(reservation.startAt, tz);
                var end = moment.tz(reservation.endAt, tz);
                if (start.isDST()) {
                    start.add(-1, 'hour');
                }
                if (end.isDST()) {
                    end.add(-1, 'hour');
                }
                reservation.occasion = {
                    startAt: start.format('HH:mm'),
                    endAt: end.format('HH:mm')
                };
            };

            self.listEnrolments = function () {
                var deferred = $q.defer();

                enrolmentApi.query(function (enrolments) {
                        enrolments.forEach(function (e) {
                            if (e.reservation) {
                                setOccasion(e.reservation);
                            }
                        });
                        deferred.resolve({result: enrolments});
                    },
                    function (error) {
                        deferred.reject(error);
                    }
                );
                return deferred.promise;
            };

        }]);

