(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("ReservationResource", ['$resource', function ($resource) {
            return {
                reservations: $resource("/reservations"),
                reservation: $resource("/reservations/:id", {id: "@id"},
                    {"remove": {method: "DELETE", params: {id: "id"}}}
                ),
                students: $resource("/reservations/students"),
                teachers: $resource("/reservations/teachers"),
                exams: $resource("/reservations/exams"),
                examrooms: $resource("/reservations/examrooms"),
                machines: $resource("/machines")
            };
        }]);
}());