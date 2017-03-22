'use strict';
angular.module("administrative.users")
    .factory("UserManagement", ['$resource',
        function ($resource) {
            return {
                users: $resource("/app/users"),
                permissions: $resource("/app/permissions", {}, {
                    "add": {method: "POST"},
                    "remove": {method: "DELETE"}
                }),
                roles: $resource("/app/users/:id/roles/:role", {
                        id: "@id", role: "@role"
                    },
                    {
                        "add": {method: "POST", params: {id: "@id", role: "@role"}},
                        "update": {method: "PUT", params: {id: "@id", role: "@role"}},
                        "remove": {method: "DELETE", params: {id: "@id", role: "@role"}}
                    })
            };
        }
    ]);
