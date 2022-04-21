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
import { Component, Input, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Address } from '../rooms/room.service';
import { RoomService } from '../rooms/room.service';

@Component({
    templateUrl: './address.component.html',
    selector: 'exam-address',
})
export class AddressComponent {
    @Input() address!: Address;
    @ViewChild('addressForm', { static: false }) addressForm?: NgForm;

    constructor(private room: RoomService, private toast: ToastrService, private translate: TranslateService) {}

    validateAndUpdateAddress = () => {
        if (this.addressForm?.valid) {
            this.updateAddress();
        }
    };

    updateAddress = () =>
        this.room.updateAddress$(this.address).subscribe({
            next: () => this.toast.info(this.translate.instant('sitnet_room_address_updated')),
            error: this.toast.error,
        });
}
