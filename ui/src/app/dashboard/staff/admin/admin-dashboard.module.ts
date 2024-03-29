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
// TODO: maybe this module is redundant. Let's keep it anyway in case we want to lazy load admin stuff in the future
import { NgModule } from '@angular/core';
import { ReservationModule } from '../../../reservation/reservation.module';
import { SharedModule } from '../../../shared/shared.module';
import { AdminDashboardComponent } from './admin-dashboard.component';

@NgModule({
    imports: [SharedModule, ReservationModule],
    exports: [AdminDashboardComponent],
    declarations: [AdminDashboardComponent],
})
export class AdminDashboardModule {}
