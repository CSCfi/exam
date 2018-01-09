/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

(function () {
    'use strict';
    angular.module('app.iop')
        .factory("InteroperabilityResource", ['$resource', function ($resource) {
            return {
                facility: $resource("/integration/iop/facilities/:id",
                    {
                        id: "@id"
                    },
                    {
                        "update": {method: "PUT"}
                    }),
                facilities: $resource("/integration/iop/facilities"),
                organisations: $resource("/integration/iop/organisations"),
                slots: $resource("/integration/iop/calendar/:examId/:roomRef", {examId: "@examId", roomRef: "@roomRef"}),
                reservations: $resource("/integration/iop/reservations/external", {}, {"create": {method: "POST"}}),
                reservation: $resource("/integration/iop/reservations/external/:ref", {ref: "@ref"}, {"remove": {method: "DELETE"}})
            };
        }]);
}());
