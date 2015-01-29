(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("RoomResource", ['$resource', function ($resource) {
            return {
                rooms: $resource("/rooms/:id",
                {
                    id: "@id"
                },
                {
                    "update": {method: "PUT"},
                    "remove": {method: "DELETE"}
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

                exception: $resource("/exception/:id",
                {
                    id: "@id"
                },
                {
                    "update": {method: "PUT"},
                    "remove": {method: "DELETE"}
                }),

                draft: $resource("draft/rooms", null,
                {
                })
            }
        }]);
}());