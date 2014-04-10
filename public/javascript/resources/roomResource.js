(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("RoomRes", ['$resource', function ($resource) {
            return $resource(
                "/rooms/:id",
                {
                    id: "@id"
                },
                {
                    "update": {
                        method: "PUT"
                    }
                }
            );
        }]);
}());