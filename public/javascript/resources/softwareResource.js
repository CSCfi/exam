(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("SoftwareResource", ['$resource', function ($resource) {
            return {
                softwares: $resource("/softwares",
                    {
                    },
                    {
                        "query": {method: "GET", isArray:true}
                    }),

                software: $resource("/softwares/:id",
                    {
                        id: "@id"
                    },
                    {
                        "query": {method: "GET"},
                        "remove": {method: "DELETE"}
                    }),

                add: $resource("/softwares/add/:name",
                    {
                        name: "@name"
                    },
                    {
                        "insert": {method: "POST"}
                    }),

                update: $resource("/softwares/update/:id/:name",
                    {
                        id: "@id",
                        name: "@name"
                    },
                    {
                        "update": {method: "PUT"}
                    })
            }
        }]);
}());