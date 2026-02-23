// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { FileService } from 'src/app/shared/file/file.service';

/*
    file-select has been made accessible so that there is button (<label>)
    that is hidden from non-visual_user and keyboard accessible input field
    that is "hidden" from visual_user. Both works the same but one solution
    is hidden from the other.

    If this ever gets refactored. There should only be input field for
    file-selection. Now it's split in two to have better language support.
 */

@Component({
    selector: 'xm-attachment-selector',
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <h2 class="xm-modal-title">{{ title | translate }}</h2>
        </div>
        <div class="modal-body">
            <div class="row">
                <div class="col-3">
                    <label for="file-select" class="btn btn-success btn-file" aria-hidden="true"
                        >{{ 'i18n_choose' | translate }}
                    </label>
                    <input
                        id="file-select"
                        type="file"
                        class="attachment-input"
                        tabindex="0"
                        autofocus
                        #file
                        (change)="onFilesAdded()"
                        ariaLabel="{{ 'i18n_choose_file' | translate }}"
                    />
                </div>
                <div class="col-9 attachment-file">
                    {{ fileObject()?.name }}
                </div>
            </div>
            <div class="row pt-2">
                @if (isTeacherModal) {
                    <div class="col-12">
                        {{ 'i18n_check_file_accessible' | translate }}
                    </div>
                }
            </div>
            <div class="row">
                <div class="col-12">
                    {{ 'i18n_max_file_size' | translate }} {{ (maxFileSize() || 0) / 1000000 }} MB.
                </div>
            </div>
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-success " (click)="confirmed()" [disabled]="!fileObject()">
                {{ 'i18n_button_save' | translate }}
            </button>
            <button class="btn btn-outline-secondary me-3" (click)="activeModal.dismiss()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
    styleUrls: ['./attachment-picker.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentSelectorComponent {
    @ViewChild('file', { static: false }) file!: ElementRef;
    fileObject = signal<File | undefined>(undefined);
    maxFileSize = signal(0);
    activeModal = inject(NgbActiveModal);

    private _title = signal('');
    private _isTeacherModal = signal(false);
    private Files = inject(FileService);

    constructor() {
        this.Files.getMaxFilesize$().subscribe((data) => this.maxFileSize.set(data.filesize));
    }

    // Getters/setters for compatibility with direct property assignment pattern
    get title(): string {
        return this._title();
    }

    get isTeacherModal(): boolean {
        return this._isTeacherModal();
    }

    set title(value: string) {
        this._title.set(value);
    }

    set isTeacherModal(value: boolean) {
        this._isTeacherModal.set(value);
    }

    confirmed() {
        const currentFile = this.fileObject();
        if (currentFile) {
            this.activeModal.close({ $value: { attachmentFile: currentFile } });
        }
    }

    onFilesAdded() {
        const files: { [key: string]: File } = this.file.nativeElement.files;
        for (const key in files) {
            if (!isNaN(parseInt(key))) {
                this.fileObject.set(files[key]);
                break;
            }
        }
    }
}
