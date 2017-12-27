/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.common')
    .factory('UserRes', ['$resource', function ($resource) {
        return {
            userRoles: $resource("/app/users/:id/roles/:role", {
                    id: "@id", role: "@role"
                },
                {
                    "update": {method: "PUT", params: {id: "@id", role: "@role"}}
                }),
            usersByRole: $resource("/app/users/byrole/:role",
                {
                    role: "@role"
                }),

            filterUsers: $resource("/app/users/filter/:role",
                {
                    role: "@role"
                }),

            filterUsersByExam: $resource("/app/users/filter/:role/:eid",
                {
                    eid: "@eid",
                    role: "@role"
                }),

            filterOwnersByExam: $resource("/app/users/exam/owners/:role/:eid",
                {
                    eid: "@eid",
                    role: "@role"
                }),
            filterOwnersByQuestion: $resource("/app/users/question/owners/:role",
                {
                    role: "@role"
                }),

            updateAgreementAccepted: $resource("/app/users/agreement", {},
                {
                    "update": {method: "PUT"}
                }),
            unenrolledStudents: $resource("/app/students/:eid",
                {
                    eid: "@eid"
                })
        };
    }]);

