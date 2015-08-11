(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("EnrollRes", ['$resource', function ($resource) {
            return {
                list: $resource("/enroll/:code",
                    {
                        code: "@code"
                    },
                    {
                        "get": {method: "GET", isArray: true, params: {code: "@code"}}
                    }),
                enrolment: $resource("/enroll/:id", {id: "@id"}, {"remove": {method: "DELETE"}}),
                enroll: $resource("/enroll/:code/exam/:id",
                    {
                        code: "@code", id: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: false, params: {code: "@code", id: "@id"}},
                        "create": {method: "POST", params: {code: "@code", id: "@id"}}
                    }),
                enrollStudent: $resource("/enroll/student/:eid/:uid ",
                    {
                        eid: "@eid", uid: "@uid"
                    },
                    {
                        "create": {method: "POST", params: {eid: "@eid", uid: "@uid"}}
                    }),
                unenrollStudent: $resource("/enroll/student/:id", {id: "@id"}, {"remove": {method: "DELETE"}}),
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