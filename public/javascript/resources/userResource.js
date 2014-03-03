(function () {
    'use strict';
    angular.module("sitnet.resources").factory("UserRes",
        ['$resource', function ($resource) {
            return $resource("/users/:id", {
                id: "@id"
            }, {
                "update": {
                    method: "PUT"
                },

                "delete": {
                    method: 'DELETE',
                    params: {
                        id: "@id"
                    }
                }
            });
        } ]);
}());