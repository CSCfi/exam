(function () {
    'use strict';
    angular.module("exam.resources")
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
                slots: $resource("/integration/iop/calendar/:examId/:roomRef", {examId: "@examId", roomRef: "@roomRef"})
            };
        }]);
}());
