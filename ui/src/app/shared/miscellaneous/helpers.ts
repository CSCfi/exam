// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isNumber = (a: any): a is number => typeof a === 'number';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isObject = (a: any): a is Object => a instanceof Object;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isString = (a: any): a is string => typeof a === 'string';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isBoolean = (a: any): a is boolean => a === !!a;
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
