(function () {
    'use strict';
    angular.module('app.facility')
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
                exceptions: $resource("/app/exception",
                    {},
                    {
                        "update": {method: "PUT"}
                    }),

                exception: $resource("/app/rooms/:roomId/exception/:exceptionId",
                    {
                        roomId: "@roomId",
                        exceptionId: "@exceptionId"
                    },
                    {
                        "remove": {method: "DELETE"}
                    }),

                draft: $resource("/app/draft/rooms")
            };
        }]);
}());
