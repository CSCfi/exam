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
import {
    AfterViewChecked, AfterViewInit, Component, forwardRef, Input, NgZone, OnDestroy,
    ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';

declare var CKEDITOR: any;

@Component({
    selector: 'ckeditor',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CKEditorComponent),
            multi: true,
        },
    ],
    template: `<textarea #host></textarea>`,
})
export class CKEditorComponent implements AfterViewChecked, AfterViewInit, OnDestroy, ControlValueAccessor {

    @Input() enableClozeTest: boolean;
    @Input()
    set value(v) {
        if (v !== this._value) {
            this._value = v;
            this.onChange(v);
        }
    }
    get value(): any {
        return this._value;
    }

    @ViewChild('host') host: any;

    instance: any;
    _value: any;
    onChange(_: any) { }
    onTouched() { }

    constructor(private zone: NgZone, private translate: TranslateService) { }

    updateValue(value: any) {
        this.zone.run(() => {
            this.onChange(value);
            this.onTouched();
            this.value = value;
        });
    }

    private documentContains = (n: Node) => document.contains ? document.contains(n) : document.body.contains(n);

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
                if (this.instance.getData() !== this.value) {
                    this.instance.setData(this.value);
                }
            });
            const update = () => {
                this.onTouched();
                this.updateValue(this.instance.getData());
            };
            this.instance.on('change', _.debounce(update, 500));
            this.instance.on('dataReady', _.debounce(update, 500));
            this.instance.on('key', _.debounce(update, 500));
            this.instance.on('mode', update);
        }
    }

    ngAfterViewChecked(): void {
        this.editorInit();
    }

    ngAfterViewInit(): void {
        this.editorInit();
    }

    ngOnDestroy() {
        if (this.instance) {
            setTimeout(() => {
                this.instance.removeAllListeners();
                CKEDITOR.instances[this.instance.name].destroy();
                this.instance.destroy();
                this.instance = null;
            });
        }
    }

    writeValue(value: any) {
        this._value = value;
        if (this.instance) {
            this.instance.setData(value);
        }
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

}
