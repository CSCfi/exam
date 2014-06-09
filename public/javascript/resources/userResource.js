(function () {
    'use strict';
    angular.module("sitnet.resources")
    	.factory("UserRes", ['$resource', function ($resource) {
            return { 
	            users: $resource("/users/:id", 
	            {
	                id: "@id"
	            }, 
	            {
	                "update": {
	                    method: "PUT"
	                },
	
	                "delete": {
	                    method: 'DELETE', params: {id: "@id"}
	                }
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
                })
            }
        }]);
}());