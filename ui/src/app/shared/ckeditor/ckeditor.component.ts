// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

/// <reference types="ckeditor" />

import type { AfterViewChecked, AfterViewInit, OnDestroy } from '@angular/core';
import { Component, DOCUMENT, ElementRef, Inject, Input, NgZone, ViewChild, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { debounce } from 'src/app/shared/miscellaneous/helpers';

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
    styles: [
        `
            .marker {
                background-color: yellow;
            }
        `,
    ],
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
