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
import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
    NgbModal,
    NgbNav,
    NgbNavContent,
    NgbNavItem,
    NgbNavItemRole,
    NgbNavLink,
    NgbNavOutlet,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { from } from 'rxjs';
import type { MaintenancePeriod } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.service';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { SoftwareComponent } from 'src/app/software/software.component';
import { AccessibilityComponent } from './accessibility/accessibility.component';
import { RoomService } from './rooms/room.service';
import { RoomListComponent } from './rooms/rooms.component';
import { MaintenancePeriodDialogComponent } from './schedule/maintenance-period-dialog.component';

@Component({
    templateUrl: './facility.component.html',
    selector: 'xm-facility',
    standalone: true,
    imports: [
        NgbNav,
        NgbNavItem,
        NgbNavItemRole,
        NgbNavLink,
        NgbNavContent,
        RoomListComponent,
        SoftwareComponent,
        AccessibilityComponent,
        NgbNavOutlet,
        TranslateModule,
        DatePipe,
        OrderByPipe,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class FacilityComponent implements OnInit {
    user: User;
    maintenancePeriods: MaintenancePeriod[] = [];

    constructor(
        private router: Router,
        private modal: NgbModal,
        private translate: TranslateService,
        private session: SessionService,
        private toast: ToastrService,
        private room: RoomService,
    ) {
        this.user = this.session.getUser();
    }

    ngOnInit() {
        this.room.listMaintenancePeriods$().subscribe((periods) => (this.maintenancePeriods = periods));
    }

    createExamRoom = () => {
        this.room.getDraft$().subscribe({
            next: (room) => {
                this.toast.info(this.translate.instant('i18n_room_draft_created'));
                this.router.navigate(['/staff/rooms', room.id]);
            },
            error: (err) => this.toast.error(err),
        });
    };

    createPeriod = () => {
        const modalRef = this.modal.open(MaintenancePeriodDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        from(modalRef.result).subscribe({
            next: (res: MaintenancePeriod) => {
                this.room.createMaintenancePeriod$(res).subscribe({
                    next: (mp) => {
                        this.toast.info(this.translate.instant('i18n_maintenance_period_created'));
                        this.maintenancePeriods.push(mp);
                    },
                    error: (err) => this.toast.error(err),
                });
            },
        });
    };

    updatePeriod = (period: MaintenancePeriod) => {
        const modalRef = this.modal.open(MaintenancePeriodDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modalRef.componentInstance.period = period;
        from(modalRef.result).subscribe({
            next: (res: MaintenancePeriod) => {
                this.room.updateMaintenancePeriod$(res).subscribe({
                    next: () => {
                        this.toast.info(this.translate.instant('i18n_maintenance_period_updated'));
                        const index = this.maintenancePeriods.indexOf(period);
                        this.maintenancePeriods.splice(index, 1, res);
                    },
                    error: (err) => this.toast.error(err),
                });
            },
        });
    };

    removePeriod = (period: MaintenancePeriod) => {
        this.room.removeMaintenancePeriod$(period).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_maintenance_period_removed'));
                this.maintenancePeriods.splice(this.maintenancePeriods.indexOf(period), 1);
            },
            error: (err) => this.toast.error(err),
        });
    };

    editMultipleRooms = () => this.router.navigate(['/staff/multiroom']);

    goBack = (event: Event) => {
        event.preventDefault();
        window.history.back();
    };

    getHeadingTranslation = (translation: string) => this.translate.instant(translation);
}
