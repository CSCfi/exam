'use strict';

angular
    .module('app.facility.machines')
    .factory('Machines', ['$resource',
        function ($resource) {
            return {
                software: $resource("/app/softwares"),
                machineSoftware: $resource("/app/machine/:mid/software/:sid",
                    {
                        mid: "@mid",
                        sid: "@sid"
                    },
                    {
                        "toggle": {method: "POST"}
                    }),
                machine: $resource("/app/machines/:id",
                    {
                        id: "@id"
                    },
                    {
                        "get": {method: "GET"},
                        "update": {method: "PUT"},
                        "insert": {method: "POST"},
                        "remove": {method: "DELETE"}
                    })
            };
        }
    ]);

