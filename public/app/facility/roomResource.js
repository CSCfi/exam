(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("RoomResource", ['$resource', function ($resource) {
            return {
                rooms: $resource("/app/rooms/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT"},
                        "inactivate": {method: "DELETE"},
                        "activate": {method: "POST"}
                    }),

                addresses: $resource("/app/address/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT"}
                    }),

                workingHours: $resource("/app/workinghours/", null, {
                    "update": {method: "PUT"}
                }),
                examStartingHours: $resource("/app/startinghours/", null,
                    {
                        "update": {method: "PUT"}
                    }
                ),
                exception: $resource("/app/exception/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT"},
                        "remove": {method: "DELETE"}
                    }),

                draft: $resource("/app/draft/rooms")
            };
        }]);
}());
