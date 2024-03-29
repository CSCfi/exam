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
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../shared/shared.module';
import { DevLoginComponent } from './dev/dev-login.component';
import { EulaDialogComponent } from './eula/eula-dialog.component';
import { LogoutComponent } from './logout/logout.component';
import { SelectRoleDialogComponent } from './role/role-picker-dialog.component';
import { SessionExpireWarningComponent } from './session-timeout-toastr';
import { SessionService } from './session.service';

@NgModule({
    imports: [NgbDropdownModule, SharedModule],
    exports: [DevLoginComponent],
    declarations: [
        DevLoginComponent,
        EulaDialogComponent,
        SelectRoleDialogComponent,
        LogoutComponent,
        SessionExpireWarningComponent,
    ],
    bootstrap: [EulaDialogComponent, SelectRoleDialogComponent],
    providers: [SessionService],
})
export class SessionModule {}
