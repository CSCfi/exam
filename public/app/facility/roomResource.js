(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("RoomResource", ['$resource', function ($resource) {
            return {
                rooms: $resource("/rooms/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT"},
                        "inactivate": {method: "DELETE"},
                        "activate": {method: "POST"}
                    }),

                addresses: $resource("/address/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT"}
                    }),

                workinghours: $resource("/workinghours/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT"}
                    }),
                examStartingHours: $resource("/startinghours/:id",
                    {
                        id: "@id"
                    }
                    ,
                    {
                        "update": {method: "PUT"}
                    }
                ),
                exception: $resource("/exception/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT"},
                        "remove": {method: "DELETE"}
                    }),

                draft: $resource("draft/rooms")
            }
        }]);
}());