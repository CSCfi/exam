(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("EnrollRes", ['$resource', function ($resource) {
            return {
                list: $resource("/enroll/:code",
                    {
                        code: "@code"
                    },
                    {
                        "get": {method: "GET", isArray: true, params: {code: "@code"}}
                    }),

                enroll: $resource("/enroll/:code/exam/:id",
                    {
                        code: "@code", id: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: false, params: {code: "@code", id: "@id"}},
                        "create": {method: "POST", params: {code: "@code", id: "@id"}}
                    }),
                reservations: $resource("/machines/:id/reservations",
                    {
                        id: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: true}
                    }),
                enrolmentsByReservation: $resource("/enroll/reservation/:id",
                    {
                        code: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: true, params: {code: "@code"}}
                    }),
                check: $resource("/enroll/exam/:id",
                    {
                        code: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: false, params: {id: "@id"}}
                    }
                )
            };
        }]);
}());