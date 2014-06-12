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
                        "get":    {method: "GET", isArray: true, params: {code: "@code"}},

                    }),
                    enroll: $resource("/enroll/:code/exam/:id",
            		{
                    	code: "@code", id: "@id"
            		},
            		{
            			"get":    {method: "GET", isArray: false, params: {code: "@code", id: "@id"}},
            			"create": {method: "POST", params: {code: "@code", id: "@id"}},
            			
            		})

            }
        }]);
}());