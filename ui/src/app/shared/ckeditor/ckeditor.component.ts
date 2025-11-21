// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BlurEvent, ChangeEvent, CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { TranslateService } from '@ngx-translate/core';
import {
    AccessibilityHelp,
    Alignment,
    Autoformat,
    AutoLink,
    Autosave,
    BalloonToolbar,
    BlockQuote,
    Bold,
    ClassicEditor,
    Code,
    CodeBlock,
    Editor,
    EditorConfig,
    Essentials,
    FindAndReplace,
    GeneralHtmlSupport,
    Heading,
    Highlight,
    HorizontalLine,
    Indent,
    IndentBlock,
    Italic,
    Link,
    List,
    ListProperties,
    Paragraph,
    PasteFromOffice,
    RemoveFormat,
    SelectAll,
    SourceEditing,
    SpecialCharacters,
    SpecialCharactersArrows,
    SpecialCharactersCurrency,
    SpecialCharactersEssentials,
    SpecialCharactersLatin,
    SpecialCharactersMathematical,
    SpecialCharactersText,
    Strikethrough,
    Subscript,
    Superscript,
    Table,
    TableCaption,
    TableCellProperties,
    TableColumnResize,
    TableProperties,
    TableToolbar,
    TextTransformation,
    TodoList,
    Underline,
    Undo,
    WordCount,
} from 'ckeditor5';
import i18nEn from 'ckeditor5/translations/en.js';
import i18nFi from 'ckeditor5/translations/fi.js';
import i18nSv from 'ckeditor5/translations/sv.js';
import { CKEditorInitializationService } from './ckeditor-initialization.service';
import { Cloze } from './plugins/clozetest/plugin';
import { Math } from './plugins/math/plugin';

@Component({
    selector: 'xm-ckeditor',
    template: `<div id="editor">
        @if (isLayoutReady()) {
            <ckeditor
                #cke
                [required]="required()"
                [editor]="editor"
                [config]="editorConfig"
                tagName="textarea"
                [ngModel]="data()"
                (ngModelChange)="onDataChange($event)"
                (ready)="onReady($event)"
                (change)="onChange($event)"
                (blur)="onBlur($event)"
            ></ckeditor>
        }
        <div [id]="id()"></div>
    </div> `,
    imports: [FormsModule, CKEditorModule],
    styleUrls: ['./ckeditor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CKEditorComponent implements AfterViewInit {
    data = input('');
    required = input(false);
    enableClozeTest = input(false);
    id = input('word-count-id');
    dataChange = output<string>();

    editor = ClassicEditor;
    editorConfig!: EditorConfig;

    isLayoutReady = signal(false);

    private changeDetector = inject(ChangeDetectorRef);
    private Translate = inject(TranslateService);
    private initializationService = new CKEditorInitializationService(this.changeDetector);

    ngAfterViewInit() {
        const toolbarItems = [
            'undo',
            'redo',
            'findAndReplace',
            '|',
            'link', // cloze plugin comes here if enabled
            '|',
            'heading',
            '|',
            'bold',
            'italic',
            'underline',
            'strikethrough',
            'subscript',
            'superscript',
            'code',
            'removeFormat',
            '|',
            'math',
            'specialCharacters',
            'horizontalLine',
            'insertTable',
            'highlight',
            'blockQuote',
            'codeBlock',
            '|',
            'alignment',
            '|',
            'bulletedList',
            'numberedList',
            'todoList',
            'outdent',
            'indent',
            '|',
            'sourceEditing',
        ];
        if (this.enableClozeTest()) {
            toolbarItems.splice(5, 0, 'cloze');
        }
        this.editorConfig = {
            toolbar: {
                items: toolbarItems,
                shouldNotGroupWhenFull: true,
            },
            plugins: [
                AccessibilityHelp,
                Alignment,
                Autoformat,
                AutoLink,
                Autosave,
                BalloonToolbar,
                BlockQuote,
                Bold,
                Code,
                CodeBlock,
                Essentials,
                FindAndReplace,
                GeneralHtmlSupport,
                Heading,
                Highlight,
                HorizontalLine,
                Indent,
                IndentBlock,
                Italic,
                Link,
                List,
                ListProperties,
                Paragraph,
                PasteFromOffice,
                RemoveFormat,
                SelectAll,
                SourceEditing,
                SpecialCharacters,
                SpecialCharactersArrows,
                SpecialCharactersCurrency,
                SpecialCharactersEssentials,
                SpecialCharactersLatin,
                SpecialCharactersMathematical,
                SpecialCharactersText,
                Strikethrough,
                Subscript,
                Superscript,
                Table,
                TableCaption,
                TableCellProperties,
                TableColumnResize,
                TableProperties,
                TableToolbar,
                TextTransformation,
                TodoList,
                Underline,
                Undo,
                WordCount,
                Cloze,
                Math,
            ],
            balloonToolbar: ['bold', 'italic', '|', 'link', '|', 'bulletedList', 'numberedList'],
            heading: {
                options: [
                    {
                        model: 'paragraph',
                        title: 'Paragraph',
                        class: 'ck-heading_paragraph',
                    },
                    {
                        model: 'heading1',
                        view: 'h1',
                        title: 'Heading 1',
                        class: 'ck-heading_heading1',
                    },
                    {
                        model: 'heading2',
                        view: 'h2',
                        title: 'Heading 2',
                        class: 'ck-heading_heading2',
                    },
                    {
                        model: 'heading3',
                        view: 'h3',
                        title: 'Heading 3',
                        class: 'ck-heading_heading3',
                    },
                    {
                        model: 'heading4',
                        view: 'h4',
                        title: 'Heading 4',
                        class: 'ck-heading_heading4',
                    },
                    {
                        model: 'heading5',
                        view: 'h5',
                        title: 'Heading 5',
                        class: 'ck-heading_heading5',
                    },
                    {
                        model: 'heading6',
                        view: 'h6',
                        title: 'Heading 6',
                        class: 'ck-heading_heading6',
                    },
                ],
            },
            htmlSupport: {
                allow: [
                    {
                        name: /^.*$/,
                        styles: true,
                        attributes: true,
                        classes: true,
                    },
                ],
            },
            link: {
                addTargetToExternalLinks: true,
                defaultProtocol: 'https://',
                decorators: {
                    toggleDownloadable: {
                        mode: 'manual',
                        label: 'Downloadable',
                        attributes: {
                            download: 'file',
                        },
                    },
                },
            },
            menuBar: {
                isVisible: true,
            },
            language: { ui: this.Translate.currentLang },
            placeholder: this.Translate.instant('i18n_content_goes_here'),
            table: {
                contentToolbar: [
                    'tableColumn',
                    'tableRow',
                    'mergeTableCells',
                    'tableProperties',
                    'tableCellProperties',
                ],
            },
            translations: [i18nFi, i18nSv, i18nEn],
        };
        this.isLayoutReady.set(true);
        this.changeDetector.markForCheck();
    }

    onReady(e: Editor) {
        this.initializationService.initializeEditor(e, this.id());
    }

    onDataChange(value: string) {
        this.dataChange.emit(value);
    }

    onChange({ editor }: ChangeEvent) {
        if (!editor) {
            console.warn('CKEditor onChange called but editor is undefined');
            return;
        }

        const data = editor.getData();
        this.dataChange.emit(data);
        this.changeDetector.markForCheck();
        // Note: Math processing is handled by the debounced change:data listener in onReady
    }

    onBlur({ editor }: BlurEvent) {
        if (!editor) {
            console.warn('CKEditor onBlur called but editor is undefined');
            return;
        }

        const data = editor.getData();
        this.dataChange.emit(data);
        this.changeDetector.markForCheck();
        // Note: Math processing is handled by the debounced change:data listener in onReady
    }
}
