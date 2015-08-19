(function () {
    'use strict';
    angular.module("exam.resources")
    	.factory("UserRes", ['$resource', function ($resource) {
            return { 
	            users: $resource("/users"),
                userRoles: $resource("/users/:id/roles/:role", {
                    id: "@id", role: "@role"

                },
                {
                    "add": {method: "POST", params: {id: "@id", role: "@role"}},
                    "update": {method: "PUT", params: {id: "@id", role: "@role"}},
                    "remove" : {method: "DELETE", params: {id: "@id", role: "@role"}}
                }),
	            usersByRole: $resource("/users/byrole/:role",
	            {
	            	role: "@role"
	            }),

                filterUsers: $resource("/users/filter/:role",
                {
                    role: "@role"
                }),

                filterUsersByExam: $resource("/users/filter/:role/:eid",
                {
                    eid: "@eid",
                    role: "@role"
                }),

                filterOwnersByExam: $resource("/users/filter/owner/:role/:eid",
                    {
                        eid: "@eid",
                        role: "@role"
                    }),

                updateAgreementAccepted: $resource("/users/agreement/:id",
                 {
                     id: "@id"
                 },
                 {
                     "update": {
                         method: "PUT", params: {id: "@id"}
                     }
                 }),
                unenrolledStudents: $resource("students/:eid",
                {
                    eid: "@eid"
                })
            }
        }]);
}());