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
/// <reference types="ckeditor" />
import { DOCUMENT } from '@angular/common';
import type { AfterViewChecked, AfterViewInit, OnDestroy } from '@angular/core';
import { Component, ElementRef, forwardRef, Inject, Input, NgZone, ViewChild } from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { debounce } from '../miscellaneous/helpers';

@Component({
    selector: 'xm-ckeditor',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CKEditorComponent),
            multi: true,
        },
    ],
    template: ` <textarea #host [required]="required"></textarea> `,
    standalone: true,
})
export class CKEditorComponent implements AfterViewChecked, AfterViewInit, OnDestroy, ControlValueAccessor {
    @ViewChild('host', { static: false }) host!: ElementRef;
    @Input() required = false;
    @Input() enableClozeTest = false;
    instance!: CKEDITOR.editor | null;
    _value = '';
    onChange!: (_: string) => unknown;
    onTouched!: () => unknown;

    constructor(
        private zone: NgZone,
        private translate: TranslateService,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    @Input()
    get value(): string {
        return this._value;
    }
    set value(v) {
        if (v !== this._value) {
            this._value = v;
            this.onChange(v);
        }
    }

    updateValue(value: string) {
        this.zone.run(() => {
            this.onChange(value);
            this.onTouched();
            this.value = value;
        });
    }

    editorInit() {
        if (typeof CKEDITOR === 'undefined') {
            console.warn('CKEditor 4.x is missing');
        } else {
            // Check textarea exists
            if (this.instance || !this.documentContains(this.host.nativeElement)) {
                return;
            }
            // We need to disable some paste tools when cloze test editing is ongoing. There's a risk that
            // dysfunctional formatting gets pasted which can break the cloze test markup.
            const removals = this.enableClozeTest ? 'Underline,Paste,PasteFromWord' : 'Underline,Cloze';
            const config = { removeButtons: removals, language: this.translate.currentLang };

            this.instance = CKEDITOR.replace(this.host.nativeElement, config);
            this.instance.setData(this.value);
            this.instance.on('instanceReady', () => {
                // if value has changed while instance loading
                // update instance with current component value
                if (this.instance && this.instance.getData() !== this.value) {
                    this.instance.setData(this.value);
                }
            });
            const update = () => {
                this.onTouched();
                if (this.instance) this.updateValue(this.instance.getData());
            };
            setTimeout(() => {
                this.instance?.on('change', debounce(update, 500));
                this.instance?.on('dataReady', debounce(update, 500));
                this.instance?.on('key', debounce(update, 500));
                this.instance?.on('mode', update);
            }, 500);
        }
    }

    ngAfterViewInit(): void {
        this.editorInit();
    }

    ngAfterViewChecked(): void {
        this.editorInit();
    }

    ngOnDestroy() {
        if (this.instance) {
            this.instance.removeAllListeners();
            CKEDITOR.instances[this.instance.name].destroy();
            this.instance.destroy();
            this.instance = null;
        }
    }

    writeValue(value: string) {
        this._value = value;
        if (this.instance) {
            this.instance.setData(value);
        }
    }

    registerOnChange(fn: (_: unknown) => unknown): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => unknown): void {
        this.onTouched = fn;
    }

    private documentContains = (n: Node) =>
        this.document.contains ? this.document.contains(n) : this.document.body.contains(n);
}
