export const isNumber = (a: unknown): a is number => typeof a === 'number';
export const isObject = (a: unknown): a is Record<string, unknown> => a instanceof Object;
export const isString = (a: unknown): a is string => typeof a === 'string';
export const isBoolean = (a: unknown): a is boolean => a === !!a;
export const debounce = <F extends (...args: unknown[]) => ReturnType<F>>(func: F, waitFor: number) => {
    let timeout: number;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise((resolve) => {
            if (timeout) {
                window.clearTimeout(timeout);
            }
            timeout = window.setTimeout(() => resolve(func(...args)), waitFor);
        });
};
