(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("ExamRes", ['$resource', function ($resource) {
            return {
                exams: $resource("/exams/:id",
                {
                    id: "@id"
                },
                {
                    "update": {
                        method: "PUT"
                    }
                }),
                sections: $resource("/exams/:eid/section/:sid",
                {
                    eid: "@eid", sid: "@sid"
                },
                {
                    "insertSection": {
                        method: "POST", params: { eid: "@eid" , sid: "@sid"}
                    }

                })
            }
        }]);
}());