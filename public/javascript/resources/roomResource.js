(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("RoomRes", ['$resource', function ($resource) {
            return {
                rooms: $resource("/rooms/:id",
                {
                    id: "@id"
                },
                {
                    "update": {method: "PUT"}
                }),

                draft: $resource("draft/rooms", null,
                {
                })
            }
        }]);
}());