/*
 * Copyright (c) 2018 Exam Consortium
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
import { downgradeComponent, downgradeInjectable } from '@angular/upgrade/static';
import * as angular from 'angular';

import { AdminReservationComponent } from './admin/adminReservations.component';
import { ChangeMachineDialogComponent } from './admin/changeMachineDialog.component';
import { RemoveReservationDialogComponent } from './admin/removeReservationDialog.component';
import { ReservationService } from './reservation.service';
import { ReservationDetailsComponent } from './reservationDetails.component';
import { TeacherReservationComponent } from './teacher/teacherReservations.component';


export default angular.module('app.reservation', [])
    .service('Reservation', downgradeInjectable(ReservationService))
    .directive('adminReservations', downgradeComponent({ component: AdminReservationComponent }))
    .directive('teacherReservations', downgradeComponent({ component: TeacherReservationComponent }))
    .directive('reservationDetail', downgradeComponent({ component: ReservationDetailsComponent }))
    .directive('changeMachineDialog', downgradeComponent({ component: ChangeMachineDialogComponent }))
    .directive('removeReservationDialog', downgradeComponent({ component: RemoveReservationDialogComponent }))
    .name;
