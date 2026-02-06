// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
    NgbNav,
    NgbNavContent,
    NgbNavItem,
    NgbNavItemRole,
    NgbNavLink,
    NgbNavOutlet,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { SoftwareComponent } from 'src/app/software/software.component';
import { AccessibilityComponent } from './accessibility/accessibility.component';
import { MaintenancePeriod } from './facility.model';
import { RoomService } from './rooms/room.service';
import { RoomListComponent } from './rooms/rooms.component';
import { MaintenancePeriodDialogComponent } from './schedule/maintenance-period-dialog.component';

@Component({
    templateUrl: './facility.component.html',
    selector: 'xm-facility',
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

    private router = inject(Router);
    private modal = inject(ModalService);
    private translate = inject(TranslateService);
    private session = inject(SessionService);
    private toast = inject(ToastrService);
    private room = inject(RoomService);

    constructor() {
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

    createPeriod = () =>
        this.modal.open$<MaintenancePeriod>(MaintenancePeriodDialogComponent, { size: 'lg' }).subscribe((res) => {
            this.room.createMaintenancePeriod$(res).subscribe({
                next: (mp) => {
                    this.toast.info(this.translate.instant('i18n_maintenance_period_created'));
                    this.maintenancePeriods.push(mp);
                },
                error: (err) => this.toast.error(err),
            });
        });

    updatePeriod = (period: MaintenancePeriod) => {
        const modalRef = this.modal.openRef(MaintenancePeriodDialogComponent, { size: 'lg' });
        modalRef.componentInstance.period = period;
        this.modal.result$<MaintenancePeriod>(modalRef).subscribe((res) => {
            this.room.updateMaintenancePeriod$(res).subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('i18n_maintenance_period_updated'));
                    const index = this.maintenancePeriods.indexOf(period);
                    this.maintenancePeriods.splice(index, 1, res);
                },
                error: (err) => this.toast.error(err),
            });
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

    editMultipleRooms = () => this.router.navigate(['/staff/rooms/exceptions/bulk']);

    goBack = (event: Event) => {
        event.preventDefault();
        window.history.back();
    };

    getHeadingTranslation = (translation: string) => this.translate.instant(translation);
}
