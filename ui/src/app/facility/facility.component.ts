// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

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
import { catchError, tap } from 'rxjs/operators';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';
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
        private errorHandler: ErrorHandlingService,
    ) {
        this.user = this.session.getUser();
    }

    ngOnInit() {
        this.room
            .listMaintenancePeriods$()
            .pipe(catchError((err) => this.errorHandler.handle(err, 'FacilityComponent.ngOnInit')))
            .subscribe((periods) => (this.maintenancePeriods = periods));
    }

    createExamRoom = () => {
        this.room
            .getDraft$()
            .pipe(
                tap((room) => {
                    this.toast.info(this.translate.instant('i18n_room_draft_created'));
                    this.router.navigate(['/staff/rooms', room.id]);
                }),
                catchError((err) => this.errorHandler.handle(err, 'FacilityComponent.createExamRoom')),
            )
            .subscribe();
    };

    createPeriod = () => {
        const modalRef = this.modal.open(MaintenancePeriodDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        from(modalRef.result)
            .pipe(
                tap((res: MaintenancePeriod) => {
                    this.room
                        .createMaintenancePeriod$(res)
                        .pipe(
                            tap((mp) => {
                                this.toast.info(this.translate.instant('i18n_maintenance_period_created'));
                                this.maintenancePeriods.push(mp);
                            }),
                            catchError((err) => this.errorHandler.handle(err, 'FacilityComponent.createPeriod')),
                        )
                        .subscribe();
                }),
                catchError((err) => this.errorHandler.handle(err, 'FacilityComponent.createPeriod.modal')),
            )
            .subscribe();
    };

    updatePeriod = (period: MaintenancePeriod) => {
        const modalRef = this.modal.open(MaintenancePeriodDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modalRef.componentInstance.period = period;
        from(modalRef.result)
            .pipe(
                tap((res: MaintenancePeriod) => {
                    this.room
                        .updateMaintenancePeriod$(res)
                        .pipe(
                            tap(() => {
                                this.toast.info(this.translate.instant('i18n_maintenance_period_updated'));
                                const index = this.maintenancePeriods.indexOf(period);
                                this.maintenancePeriods.splice(index, 1, res);
                            }),
                            catchError((err) => this.errorHandler.handle(err, 'FacilityComponent.updatePeriod')),
                        )
                        .subscribe();
                }),
                catchError((err) => this.errorHandler.handle(err, 'FacilityComponent.updatePeriod.modal')),
            )
            .subscribe();
    };

    removePeriod = (period: MaintenancePeriod) => {
        this.room
            .removeMaintenancePeriod$(period)
            .pipe(
                tap(() => {
                    this.toast.info(this.translate.instant('i18n_maintenance_period_removed'));
                    this.maintenancePeriods.splice(this.maintenancePeriods.indexOf(period), 1);
                }),
                catchError((err) => this.errorHandler.handle(err, 'FacilityComponent.removePeriod')),
            )
            .subscribe();
    };

    editMultipleRooms = () => this.router.navigate(['/staff/multiroom']);

    goBack = (event: Event) => {
        event.preventDefault();
        window.history.back();
    };

    getHeadingTranslation = (translation: string) => this.translate.instant(translation);
}
