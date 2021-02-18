export class QuestionBase<T> {
    value?: T;
    key: string;
    order: number;
    size: number;
    controlType: string;
    type: string;
    options: { key: string; value: string }[];

    constructor(
        options: {
            value?: T;
            key?: string;
            order?: number;
            size?: number;
            controlType?: string;
            type?: string;
            options?: { key: string; value: string }[];
        } = {},
    ) {
        this.value = options.value;
        this.key = options.key || '';
        this.order = options.order === undefined ? 1 : options.order;
        this.size = options.size === undefined ? 10 : options.size;
        this.controlType = options.controlType || '';
        this.type = options.type || '';
        this.options = options.options || [];
    }
}

export class TextPart extends QuestionBase<string> {
    controlType = 'text';
}

export class BlankQuestion extends QuestionBase<string> {
    controlType = 'blank';
}
