// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input, linkedSignal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Address } from 'src/app/facility/facility.model';
import { RoomService } from 'src/app/facility/rooms/room.service';

@Component({
    selector: 'xm-room-address',
    template: `
        <form role="form" novalidate id="roomAddress" (ngSubmit)="validateAndUpdateAddress()">
            <div class="row">
                <div class="col-md-6">
                    <div class="facility-info-text">{{ 'i18n_exam_room_address_street' | translate }}</div>
                    <div class="input-group">
                        <input type="text" class="form-control" [formField]="addressForm.street" />
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
                        <input type="text" class="form-control" [formField]="addressForm.zip" />
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
                        <input type="text" class="form-control" [formField]="addressForm.city" />
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
                    <button
                        type="submit"
                        [disabled]="
                            addressForm.street().invalid() ||
                            addressForm.zip().invalid() ||
                            addressForm.city().invalid()
                        "
                        class="btn btn-success"
                    >
                        {{ 'i18n_save' | translate }}
                    </button>
                </div>
            </div>
        </form>
    `,
    styleUrls: ['../rooms/rooms.component.scss'],
    imports: [FormField, NgbPopover, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressComponent {
    readonly address = input.required<Address>();

    readonly addressForm = form(
        linkedSignal(() => ({
            street: this.address().street || '',
            zip: this.address().zip || '',
            city: this.address().city || '',
        })),
        (path) => {
            required(path.street);
            required(path.zip);
            required(path.city);
        },
    );

    private readonly room = inject(RoomService);
    private readonly toast = inject(ToastrService);
    private readonly translate = inject(TranslateService);

    validateAndUpdateAddress() {
        if (
            !this.addressForm.street().invalid() &&
            !this.addressForm.zip().invalid() &&
            !this.addressForm.city().invalid()
        ) {
            const currentAddress = this.address();
            currentAddress.street = this.addressForm.street().value();
            currentAddress.zip = this.addressForm.zip().value();
            currentAddress.city = this.addressForm.city().value();
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
