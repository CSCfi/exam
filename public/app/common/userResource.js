(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("UserRes", ['$resource', function ($resource) {
            return {
                users: $resource("/app/users"),
                permissions: $resource("/app/permissions", {}, {
                    "add": {method: "POST"},
                    "remove": {method: "DELETE"}
                }),
                userRoles: $resource("/app/users/:id/roles/:role", {
                        id: "@id", role: "@role"
                    },
                    {
                        "add": {method: "POST", params: {id: "@id", role: "@role"}},
                        "update": {method: "PUT", params: {id: "@id", role: "@role"}},
                        "remove": {method: "DELETE", params: {id: "@id", role: "@role"}}
                    }),
                usersByRole: $resource("/app/users/byrole/:role",
                    {
                        role: "@role"
                    }),

                filterUsers: $resource("/app/users/filter/:role",
                    {
                        role: "@role"
                    }),

                filterUsersByExam: $resource("/app/users/filter/:role/:eid",
                    {
                        eid: "@eid",
                        role: "@role"
                    }),

                filterOwnersByExam: $resource("/app/users/exam/owners/:role/:eid",
                    {
                        eid: "@eid",
                        role: "@role"
                    }),
                filterOwnersByQuestion: $resource("/app/users/question/owners/:role/:qid",
                    {
                        qid: "@qid",
                        role: "@role"
                    }),

                updateAgreementAccepted: $resource("/app/users/agreement", {},
                    {
                        "update": {method: "PUT"}
                    }),
                unenrolledStudents: $resource("/app/students/:eid",
                    {
                        eid: "@eid"
                    })
            };
        }]);
}());
