// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    inject,
    Input,
    Output,
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
    ViewElement,
    WordCount,
} from 'ckeditor5';
import i18nEn from 'ckeditor5/translations/en.js';
import i18nFi from 'ckeditor5/translations/fi.js';
import i18nSv from 'ckeditor5/translations/sv.js';
import { ClozeElementHelperService } from './plugins/clozetest/cloze-element-helper.service';
import { Cloze } from './plugins/clozetest/plugin';
import { MathElementHelperService } from './plugins/math/math-element-helper.service';
import { MathFieldService } from './plugins/math/math-field.service';
import { Math } from './plugins/math/plugin';

@Component({
    selector: 'xm-ckeditor',
    template: `<div id="editor">
        @if (isLayoutReady()) {
            <ckeditor
                #cke
                [required]="required"
                [editor]="editor"
                [config]="editorConfig"
                tagName="textarea"
                [(ngModel)]="data"
                (ready)="onReady($event)"
                (change)="onChange($event)"
                (blur)="onBlur($event)"
            ></ckeditor>
        }
        <div [id]="id"></div>
    </div> `,
    standalone: true,
    imports: [FormsModule, CKEditorModule],
})
export class CKEditorComponent implements AfterViewInit {
    @Input() data = '';
    @Input() required = false;
    @Input() enableClozeTest = false;
    @Input() id = 'word-count-id';
    @Output() dataChange = new EventEmitter<string>();

    editor = ClassicEditor;
    editorConfig!: EditorConfig;

    isLayoutReady = signal(false);

    private changeDetector = inject(ChangeDetectorRef);
    private Translate = inject(TranslateService);
    private mathFieldService = new MathFieldService();
    private mathElementHelper = new MathElementHelperService();
    private clozeElementHelper = new ClozeElementHelperService();
    private editorInstance?: Editor;

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
        if (this.enableClozeTest) {
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
        // Store editor instance globally for nuclear replacement access
        (window as any).ckeditorInstance = e;
        this.editorInstance = e;

        const wordCountPlugin = e.plugins.get('WordCount');
        const wordCountWrapper = document.getElementById(this.id) as HTMLElement;
        wordCountWrapper.appendChild(wordCountPlugin.wordCountContainer);

        // Process any existing math elements after editor is ready
        setTimeout(() => {
            this.mathFieldService.processMathInEditor(e);
            this.changeDetector.markForCheck();
        }, 200);

        // Add CSS to ensure math and cloze elements are clickable and show hover/selection state
        const style = document.createElement('style');
        style.textContent = `
            .ck-editor__editable math-field {
                pointer-events: all !important;
                cursor: pointer !important;
                display: inline-block !important;
                min-width: 20px !important;
                min-height: 20px !important;
                position: relative !important;
            }
            .ck-editor__editable .ck-widget.math-element-selectable {
                pointer-events: all !important;
                cursor: pointer !important;
            }
            .ck-editor__editable .ck-widget.math-element-selectable:hover {
                background-color: rgba(0, 123, 255, 0.1) !important;
            }
            .ck-editor__editable .ck-widget.ck-widget_selected {
                outline: 2px solid #007bff !important;
                outline-offset: 1px !important;
                background-color: rgba(0, 123, 255, 0.05) !important;
            }
            .ck-editor__editable math-field > div {
                pointer-events: all !important;
                cursor: pointer !important;
            }
            .ck-editor__editable span[cloze],
            .ck-editor__editable span[cloze="true"],
            .ck-editor__editable .cloze-test-wrapper {
                cursor: pointer !important;
                transition: background-color 0.15s ease;
                padding: 1px 2px;
                border-radius: 2px;
            }
            .ck-editor__editable span[cloze]:hover,
            .ck-editor__editable span[cloze="true"]:hover,
            .ck-editor__editable .cloze-test-wrapper:hover {
                background-color: rgba(0, 123, 255, 0.1) !important;
            }
        `;
        document.head.appendChild(style);

        // Listen for command execution (when math dialog saves) - this is the most reliable trigger
        const mathCommand = e.commands.get('insertMath');
        if (mathCommand) {
            mathCommand.on('execute', () => {
                // Single processing trigger with reasonable delay to let CKEditor update the view
                setTimeout(() => {
                    this.mathFieldService.processMathInEditor(e);
                    this.changeDetector.markForCheck();
                }, 100);
            });
        }

        // More conservative model change listener to avoid excessive processing
        let processingTimeout: any = null;
        let lastProcessingTime = 0;
        e.model.document.on('change:data', () => {
            // Debounce and throttle the processing to avoid excessive re-initialization
            const now = Date.now();
            if (processingTimeout) clearTimeout(processingTimeout);

            // Only process if it's been at least 500ms since last processing
            const timeSinceLastProcessing = now - lastProcessingTime;
            const delay = timeSinceLastProcessing > 500 ? 100 : 500;

            processingTimeout = setTimeout(() => {
                lastProcessingTime = Date.now();
                this.mathFieldService.processMathInEditor(e);
                this.changeDetector.markForCheck();
            }, delay);
        });

        // Add double-click handler for math elements (more standard for widget editing)
        e.editing.view.document.on(
            'dblclick',
            (evt: any, data: any) => {
                const viewElement = data.target;
                const mathElement = this.mathElementHelper.findMathElementInView(viewElement);

                if (mathElement) {
                    // Prevent default behavior
                    data.preventDefault();
                    evt.stop();

                    // Select the model element and open dialog if successful
                    // Cast to ViewElement since findMathElementInView returns ViewElementLike which is compatible
                    if (this.mathElementHelper.selectMathModelElement(e, mathElement as unknown as ViewElement)) {
                        // Give the selection time to propagate before opening dialog
                        setTimeout(() => {
                            this.mathElementHelper.openMathDialog(e, 'double-click');
                            this.changeDetector.markForCheck();
                        }, 50);
                    } else {
                        console.warn('Could not find mathField model element for double-click');
                    }
                }
            },
            { priority: 'highest' },
        );

        // Add single-click handler for math and cloze elements
        e.editing.view.document.on(
            'click',
            (evt: any, data: any) => {
                const viewElement = data.target;

                // Check for math elements first
                const mathElement = this.mathElementHelper.findMathElementInView(viewElement);
                if (mathElement) {
                    // Select the model element and open dialog if successful
                    // Cast to ViewElement since findMathElementInView returns ViewElementLike which is compatible
                    if (this.mathElementHelper.selectMathModelElement(e, mathElement as unknown as ViewElement)) {
                        // Give the selection time to propagate before opening dialog
                        setTimeout(() => {
                            this.mathElementHelper.openMathDialog(e, 'single-click');
                            this.changeDetector.markForCheck();
                        }, 50);
                    } else {
                        console.warn('Could not find mathField model element');
                    }
                    return; // Don't check for cloze if we found math
                }

                // Check for cloze test elements
                const clozeElement = this.clozeElementHelper.findClozeElementInView(viewElement);
                if (clozeElement) {
                    // Select the cloze element first, then open the dialog
                    // Cast to ViewElement since findClozeElementInView returns ViewElementLike which is compatible
                    if (this.clozeElementHelper.selectClozeElement(e, clozeElement as unknown as ViewElement)) {
                        setTimeout(() => {
                            this.clozeElementHelper.openClozeDialog(e);
                            this.changeDetector.markForCheck();
                        }, 50);
                    }
                }
            },
            { priority: 'high' },
        );
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

    /**
     * Manually trigger math processing - useful for debugging or forcing updates
     */
    public forceMathProcessing(): void {
        if (this.editorInstance) {
            this.mathFieldService.processMathInEditor(this.editorInstance);
            this.changeDetector.markForCheck();
        } else {
            console.warn('⚠️ Cannot force math processing - editor not available');
        }
    }
}
