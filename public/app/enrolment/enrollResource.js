(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("EnrollRes", ['$resource', function ($resource) {
            return {
                list: $resource("/app/enroll/:code",
                    {
                        code: "@code"
                    },
                    {
                        "get": {method: "GET", isArray: true, params: {code: "@code"}}
                    }),
                enrolment: $resource("/app/enroll/:id", {id: "@id"}, {"remove": {method: "DELETE"}}),
                enroll: $resource("/app/enroll/:code/exam/:id",
                    {
                        code: "@code", id: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: false, params: {code: "@code", id: "@id"}},
                        "create": {method: "POST", params: {code: "@code", id: "@id"}}
                    }),
                enrollStudent: $resource("/app/enroll/student/:eid/:uid",
                    {
                        eid: "@eid", uid: "@uid"
                    },
                    {
                        "create": {method: "POST", params: {eid: "@eid", uid: "@uid"}}
                    }),
                unenrollStudent: $resource("/app/enroll/student/:id", {id: "@id"}, {"remove": {method: "DELETE"}}),
                reservations: $resource("/app/machines/:id/reservations",
                    {
                        id: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: true}
                    }),
                enrolmentsByReservation: $resource("/app/enroll/reservation/:id",
                    {
                        code: "@id"
                    },
                    {
                        "get": {method: "GET", isArray: true, params: {code: "@code"}}
                    }),
                check: $resource("/app/enroll/exam/:id",
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
