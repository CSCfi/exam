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
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { UIRouterModule } from '@uirouter/angular';
import { SharedModule } from '../shared/shared.module';
import { AdminReservationComponent } from './admin/admin-reservations.component';
import { ChangeMachineDialogComponent } from './admin/change-machine-dialog.component';
import { RemoveReservationDialogComponent } from './admin/remove-reservation-dialog.component';
import { ReservationDetailsComponent } from './reservation-details.component';
import { ReservationService } from './reservation.service';
import { TeacherReservationComponent } from './teacher/teacher-reservations.component';

@NgModule({
    imports: [NgbModule, SharedModule, RouterModule, UIRouterModule],
    exports: [AdminReservationComponent],
    declarations: [
        ChangeMachineDialogComponent,
        RemoveReservationDialogComponent,
        ReservationDetailsComponent,
        AdminReservationComponent,
        TeacherReservationComponent,
    ],
    bootstrap: [ChangeMachineDialogComponent, RemoveReservationDialogComponent],
    providers: [ReservationService],
})
export class ReservationModule {}
