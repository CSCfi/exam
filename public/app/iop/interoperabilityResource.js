(function () {
    'use strict';
    angular.module('app.iop')
        .factory("InteroperabilityResource", ['$resource', function ($resource) {
            return {
                facility: $resource("/integration/iop/facilities/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT"}
                    }),
                facilities: $resource("/integration/iop/facilities"),
                organisations: $resource("/integration/iop/organisations"),
                slots: $resource("/integration/iop/calendar/:examId/:roomRef", {examId: "@examId", roomRef: "@roomRef"}),
                reservations: $resource("/integration/iop/reservations/external", {}, {"create": {method: "POST"}}),
                reservation: $resource("/integration/iop/reservations/external/:ref", {ref: "@ref"}, {"remove": {method: "DELETE"}})
            };
        }]);
}());
