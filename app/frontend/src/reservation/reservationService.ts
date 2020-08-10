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
/// <reference types="angular-dialog-service" />
import * as ng from 'angular';
import { IModalService } from 'angular-ui-bootstrap';
import * as toast from 'toastr';

export class ReservationService {
    constructor(
        private $q: ng.IQService,
        private $http: ng.IHttpService,
        private $translate: ng.translate.ITranslateService,
        private $uibModal: IModalService,
        private dialogs: angular.dialogservice.IDialogService,
    ) {
        'ngInject';
    }

    printExamState = reservation =>
        reservation.noShow
            ? 'NO_SHOW'
            : reservation.enrolment.exam
            ? reservation.enrolment.exam.state
            : reservation.enrolment.collaborativeExam.state;

    removeReservation(enrolment) {
        const externalRef = enrolment.reservation.externalRef;
        const dialog = this.dialogs.confirm(
            this.$translate.instant('sitnet_confirm'),
            this.$translate.instant('sitnet_are_you_sure'),
        );
        const successFn = () => {
            delete enrolment.reservation;
            enrolment.reservationCanceled = true;
        };
        const errorFn = resp => toast.error(resp.data);

        dialog.result.then(() => {
            if (externalRef) {
                this.$http
                    .delete(`/integration/iop/reservations/external/${externalRef}`)
                    .then(successFn)
                    .catch(errorFn);
            } else {
                this.$http
                    .delete(`/app/calendar/reservation/${enrolment.reservation.id}`)
                    .then(successFn)
                    .catch(errorFn);
            }
        });
    }

    getReservationCount = exam =>
        exam.examEnrolments.filter(
            enrolment =>
                (enrolment.reservation && new Date(enrolment.reservation.endAt) > new Date()) ||
                (enrolment.examinationEventConfiguration &&
                    new Date(enrolment.examinationEventConfiguration.examinationEvent.start) > new Date()),
        ).length;

    changeMachine(reservation) {
        this.$uibModal
            .open({
                component: 'changeMachineDialog',
                resolve: {
                    reservation: reservation,
                },
                backdrop: 'static',
                keyboard: true,
            })
            .result.then(function(data) {
                if (!data.machine) {
                    return;
                }
                reservation.machine = data.machine;
            })
            .catch(angular.noop);
    }

    cancelReservation(reservation) {
        const deferred = this.$q.defer();

        this.$uibModal
            .open({
                component: 'removeReservationDialog',
                resolve: {
                    reservation: reservation,
                },
                backdrop: 'static',
                keyboard: true,
            })
            .result.then(function() {
                deferred.resolve();
            })
            .catch(function(e) {
                deferred.reject(e);
            });
        return deferred.promise;
    }
}
