(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("AdminReservationResource", ['$resource', function ($resource) {
            return {
                reservations: $resource("/admin/reservations"),
                reservationDeletion: $resource("/admin/reservations/delete/:id", {id: "@id"},
                    {"remove": {method: "DELETE", params: {id: "id"}}}
                ),
                students: $resource("/admin/students"),
                teachers: $resource("/admin/teachers"),
                exams: $resource("/admin/exams"),
                examrooms: $resource("/admin/examrooms"),
                machines: $resource("/machines")
            };
        }]);
}());