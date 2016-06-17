(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("ReservationResource", ['$resource', function ($resource) {
            return {
                reservations: $resource("/app/reservations"),
                reservation: $resource("/app/reservations/:id", {id: "@id"},
                    { "remove": {method: "DELETE", params: {id: "id"}}}
                ),
                students: $resource("/app/reservations/students"),
                teachers: $resource("/app/reservations/teachers"),
                exams: $resource("/app/reservations/exams"),
                examrooms: $resource("/app/reservations/examrooms"),
                machines: $resource("/app/machines"),
                availableMachines: $resource("/app/reservations/:id/machines", {id: "@id"}),
                machine: $resource("/app/reservations/:id/machine", {id: "@id"}, {"update": {method: "PUT"}})
            };
        }]);
}());
