/*
 *
 *  * Copyright (c) 2018 Exam Consortium
 *  *
 *  * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  * versions of the EUPL (the "Licence");
 *  * You may not use this work except in compliance with the Licence.
 *  * You may obtain a copy of the Licence at:
 *  *
 *  * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */
import * as angular from 'angular';
import * as toast from 'toastr';
import { ReservationService } from './reservationService';

export const ReservationDetailComponent: angular.IComponentOptions = {
    template: require('./reservationDetails.template.html'),
    bindings: {
        reservations: '<',
        isAdminView: '<'
    },
    controller: class ReservationDetailController implements angular.IComponentController {
        reservations: any[];

        constructor(
            private $http: angular.IHttpService,
            private $translate: angular.translate.ITranslateService,
            private Reservation: ReservationService
        ) {
            'ngInject';
        }

        printExamState = (reservation) => this.Reservation.printExamState(reservation);

        getStateclass = (reservation) =>
            reservation.noShow ? 'no_show' : reservation.enrolment.exam.state.toLowerCase()

        removeReservation(reservation) {
            this.Reservation.cancelReservation(reservation).then(() => {
                this.reservations.splice(this.reservations.indexOf(reservation), 1);
                toast.info(this.$translate.instant('sitnet_reservation_removed'));
            }).catch(angular.noop);
        }

        permitRetrial(reservation) {
            this.$http.put(`/app/reservations/${reservation.id}`, {}).then(() => {
                reservation.retrialPermitted = true;
                toast.info(this.$translate.instant('sitnet_retrial_permitted'));
            }).catch(angular.noop);
        }

        changeReservationMachine = (reservation) => this.Reservation.changeMachine(reservation);

    }
};
