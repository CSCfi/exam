// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, ViewChild, inject, input } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Address } from 'src/app/facility/facility.model';
import { RoomService } from 'src/app/facility/rooms/room.service';

@Component({
    selector: 'xm-room-address',
    template: `
        <form
            role="form"
            #addressForm="ngForm"
            name="addressForm"
            novalidate
            id="roomAddress"
            (ngSubmit)="validateAndUpdateAddress()"
        >
            <div class="row">
                <div class="col-md-6">
                    <div class="facility-info-text">{{ 'i18n_exam_room_address_street' | translate }}</div>
                    <div class="input-group">
                        <input
                            type="text"
                            name="street"
                            class="form-control"
                            [ngModel]="address().street"
                            (ngModelChange)="updateStreet($event)"
                            required
                        />
                        <span class="input-group-append">
                            <span class="input-group-text">
                                <i
                                    class="bi-question-circle"
                                    triggers="mouseenter:mouseleave"
                                    ngbPopover="{{ 'i18n_exam_room_address_street' | translate }}"
                                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                                ></i>
                            </span>
                        </span>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="facility-info-text">{{ 'i18n_exam_room_address_zip' | translate }}</div>
                    <div class="input-group">
                        <input
                            type="text"
                            name="zip"
                            class="form-control"
                            [ngModel]="address().zip"
                            (ngModelChange)="updateZip($event)"
                            required
                        />
                        <span class="input-group-append">
                            <span class="input-group-text">
                                <i
                                    class="bi-question-circle"
                                    triggers="mouseenter:mouseleave"
                                    ngbPopover="{{ 'i18n_exam_room_address_zip' | translate }}"
                                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                                ></i>
                            </span>
                        </span>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="facility-info-text">{{ 'i18n_exam_room_address_city' | translate }}</div>
                    <div class="input-group">
                        <input
                            type="text"
                            name="city"
                            class="form-control"
                            [ngModel]="address().city"
                            (ngModelChange)="updateCity($event)"
                            required
                        />
                        <span class="input-group-append">
                            <span class="input-group-text">
                                <i
                                    class="bi-question-circle"
                                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                                    triggers="mouseenter:mouseleave"
                                    ngbPopover="{{ 'i18n_exam_room_address_city' | translate }}"
                                ></i>
                            </span>
                        </span>
                    </div>
                </div>
            </div>
            <div class="row mt-4">
                <div class="col-md-12">
                    <button type="submit" [disabled]="addressForm.invalid" class="btn btn-success">
                        {{ 'i18n_save' | translate }}
                    </button>
                </div>
            </div>
        </form>
    `,
    styleUrls: ['../rooms/rooms.component.scss'],
    imports: [FormsModule, NgbPopover, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressComponent {
    @ViewChild('addressForm', { static: false }) addressForm?: NgForm;
    address = input.required<Address>();

    private room = inject(RoomService);
    private toast = inject(ToastrService);
    private translate = inject(TranslateService);

    updateStreet(value: string) {
        // Note: We're mutating the input object for backward compatibility
        // In a fully signal-based parent, the parent should handle updates
        const currentAddress = this.address();
        currentAddress.street = value;
    }

    updateZip(value: string) {
        const currentAddress = this.address();
        currentAddress.zip = value;
    }

    updateCity(value: string) {
        const currentAddress = this.address();
        currentAddress.city = value;
    }

    validateAndUpdateAddress() {
        if (this.addressForm?.valid) {
            this.updateAddress();
        }
    }

    updateAddress() {
        this.room.updateAddress$(this.address()).subscribe({
            next: () => this.toast.info(this.translate.instant('i18n_room_address_updated')),
            error: (err) => this.toast.error(err),
        });
    }
}
