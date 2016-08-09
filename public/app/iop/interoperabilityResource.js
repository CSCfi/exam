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
                    })
            };
        }]);
}());
