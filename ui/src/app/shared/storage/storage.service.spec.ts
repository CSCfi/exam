// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
    let service: StorageService;

    beforeEach(() => {
        sessionStorage.clear();
        TestBed.configureTestingModule({});
        service = TestBed.inject(StorageService);
    });

    afterEach(() => sessionStorage.clear());

    describe('set and get', () => {
        it('should store and retrieve a string value', () => {
            service.set('key', 'hello');
            expect(service.get<string>('key')).toBe('hello');
        });

        it('should store and retrieve a number value', () => {
            service.set('count', 42);
            expect(service.get<number>('count')).toBe(42);
        });

        it('should store and retrieve an object value', () => {
            const obj = { id: 1, name: 'test' };
            service.set('obj', obj);
            expect(service.get<typeof obj>('obj')).toEqual(obj);
        });

        it('should return undefined for a key that does not exist', () => {
            expect(service.get('nonexistent')).toBeUndefined();
        });

        it('should overwrite a previously stored value', () => {
            service.set('key', 'first');
            service.set('key', 'second');
            expect(service.get<string>('key')).toBe('second');
        });
    });

    describe('has', () => {
        it('should return true when a key exists', () => {
            service.set('existing', 'value');
            expect(service.has('existing')).toBe(true);
        });

        it('should return false when a key does not exist', () => {
            expect(service.has('missing')).toBe(false);
        });
    });

    describe('remove', () => {
        it('should remove a key so it is no longer retrievable', () => {
            service.set('toRemove', 'value');
            service.remove('toRemove');
            expect(service.get('toRemove')).toBeUndefined();
            expect(service.has('toRemove')).toBe(false);
        });

        it('should not throw when removing a key that does not exist', () => {
            expect(() => service.remove('nonexistent')).not.toThrow();
        });
    });

    describe('clear', () => {
        it('should remove all stored keys', () => {
            service.set('a', 1);
            service.set('b', 2);
            service.clear();
            expect(service.has('a')).toBe(false);
            expect(service.has('b')).toBe(false);
        });
    });

    describe('keys', () => {
        it('should return all stored keys', () => {
            service.set('x', 1);
            service.set('y', 2);
            const keys = service.keys();
            expect(keys).toContain('x');
            expect(keys).toContain('y');
        });

        it('should return an empty array when storage is empty', () => {
            expect(service.keys()).toEqual([]);
        });
    });
});
