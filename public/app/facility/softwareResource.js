(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("SoftwareResource", ['$resource', function ($resource) {
            return {
                machines: $resource("/app/software_machine/:mid",
                    {
                        mid: "@mid"
                    },
                    {
                        "reset": {method: "PUT"}
                    }),

                machine: $resource("/app/machine/:mid/software/:sid",
                    {
                        mid: "@mid",
                        sid: "@sid"
                    },
                    {
                        "add": {method: "PUT"},
                        "toggle": {method: "POST"}
                    }),

                softwares: $resource("/app/softwares",
                    {
                    },
                    {
                        "query": {method: "GET", isArray:true}
                    }),

                software: $resource("/app/softwares/:id",
                    {
                        id: "@id"
                    },
                    {
                        "query": {method: "GET"},
                        "remove": {method: "DELETE"}
                    }),

                add: $resource("/app/softwares/add/:name",
                    {
                        name: "@name"
                    },
                    {
                        "insert": {method: "POST"}
                    }),

                update: $resource("/app/softwares/update/:id/:name",
                    {
                        id: "@id",
                        name: "@name"
                    },
                    {
                        "update": {method: "PUT"}
                    })
            };
        }]);
}());
