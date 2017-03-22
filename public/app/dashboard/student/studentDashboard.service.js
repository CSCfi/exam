angular.module('dashboard.student')
    .service('StudentDashboard', ['$q', 'StudentExamRes',
        function ($q, StudentExamRes) {

            var self = this;

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
                    startAt: start.format("HH:mm"),
                    endAt: end.format("HH:mm")
                };
            };

            self.searchParticipations = function (filter) {
                var deferred = $q.defer();
                StudentExamRes.finishedExams.query({filter: filter},
                    function (participations) {
                        deferred.resolve({participations: participations});
                    },
                    function (error) {
                        deferred.reject(error);
                    });
                return deferred.promise;
            };

            self.listEnrolments = function () {
                var deferred = $q.defer();

                StudentExamRes.enrolments.query(function (enrolments) {
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

