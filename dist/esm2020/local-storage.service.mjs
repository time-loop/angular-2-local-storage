import { Inject, Injectable, Optional } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { share } from 'rxjs/operators';
import { LOCAL_STORAGE_SERVICE_CONFIG } from './local-storage.config.interface';
import * as i0 from "@angular/core";
const DEPRECATED = 'This function is deprecated.';
const LOCAL_STORAGE_NOT_SUPPORTED = 'LOCAL_STORAGE_NOT_SUPPORTED';
export class LocalStorageService {
    constructor(config = {}) {
        this.isSupported = false;
        this.notifyOptions = {
            setItem: false,
            removeItem: false
        };
        this.prefix = 'ls';
        this.storageType = 'localStorage';
        this.errors = new Subscriber();
        this.removeItems = new Subscriber();
        this.setItems = new Subscriber();
        this.warnings = new Subscriber();
        let { notifyOptions, prefix, storageType } = config;
        if (notifyOptions != null) {
            let { setItem, removeItem } = notifyOptions;
            this.setNotify(!!setItem, !!removeItem);
        }
        if (prefix != null) {
            this.setPrefix(prefix);
        }
        if (storageType != null) {
            this.setStorageType(storageType);
        }
        this.errors$ = new Observable((observer) => this.errors = observer).pipe(share());
        this.removeItems$ = new Observable((observer) => this.removeItems = observer).pipe(share());
        this.setItems$ = new Observable((observer) => this.setItems = observer).pipe(share());
        this.warnings$ = new Observable((observer) => this.warnings = observer).pipe(share());
        this.isSupported = this.checkSupport();
    }
    add(key, value) {
        if (console && console.warn) {
            console.warn(DEPRECATED);
            console.warn('Use `LocalStorageService.set` instead.');
        }
        return this.set(key, value);
    }
    clearAll(regularExpression) {
        // Setting both regular expressions independently
        // Empty strings result in catchall RegExp
        let prefixRegex = !!this.prefix ? new RegExp('^' + this.prefix) : new RegExp('');
        let testRegex = !!regularExpression ? new RegExp(regularExpression) : new RegExp('');
        if (!this.isSupported) {
            this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
            return false;
        }
        let prefixLength = this.prefix.length;
        for (let key in this.webStorage) {
            // Only remove items that are for this app and match the regular expression
            if (prefixRegex.test(key) && testRegex.test(key.substr(prefixLength))) {
                try {
                    this.remove(key.substr(prefixLength));
                }
                catch (e) {
                    this.errors.next(e.message);
                    return false;
                }
            }
        }
        return true;
    }
    deriveKey(key) {
        return `${this.prefix}${key}`;
    }
    get(key) {
        if (!this.isSupported) {
            this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
            return null;
        }
        let item = this.webStorage ? this.webStorage.getItem(this.deriveKey(key)) : null;
        // FIXME: not a perfect solution, since a valid 'null' string can't be stored
        if (!item || item === 'null') {
            return null;
        }
        try {
            return JSON.parse(item);
        }
        catch (e) {
            return null;
        }
    }
    getStorageType() {
        return this.storageType;
    }
    keys() {
        if (!this.isSupported) {
            this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
            return [];
        }
        let prefixLength = this.prefix.length;
        let keys = [];
        for (let key in this.webStorage) {
            // Only return keys that are for this app
            if (key.substr(0, prefixLength) === this.prefix) {
                try {
                    keys.push(key.substr(prefixLength));
                }
                catch (e) {
                    this.errors.next(e.message);
                    return [];
                }
            }
        }
        return keys;
    }
    length() {
        let count = 0;
        let storage = this.webStorage;
        for (let i = 0; i < storage.length; i++) {
            if (storage.key(i).indexOf(this.prefix) === 0) {
                count += 1;
            }
        }
        return count;
    }
    remove(...keys) {
        let result = true;
        keys.forEach((key) => {
            if (!this.isSupported) {
                this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
                result = false;
            }
            try {
                this.webStorage.removeItem(this.deriveKey(key));
                if (this.notifyOptions.removeItem) {
                    this.removeItems.next({
                        key: key,
                        storageType: this.storageType
                    });
                }
            }
            catch (e) {
                this.errors.next(e.message);
                result = false;
            }
        });
        return result;
    }
    set(key, value) {
        // Let's convert `undefined` values to `null` to get the value consistent
        if (value === undefined) {
            value = null;
        }
        else {
            value = JSON.stringify(value);
        }
        if (!this.isSupported) {
            this.warnings.next(LOCAL_STORAGE_NOT_SUPPORTED);
            return false;
        }
        try {
            if (this.webStorage) {
                this.webStorage.setItem(this.deriveKey(key), value);
            }
            if (this.notifyOptions.setItem) {
                this.setItems.next({
                    key: key,
                    newvalue: value,
                    storageType: this.storageType
                });
            }
        }
        catch (e) {
            this.errors.next(e.message);
            return false;
        }
        return true;
    }
    checkSupport() {
        try {
            let supported = this.storageType in window
                && window[this.storageType] !== null;
            if (supported) {
                this.webStorage = window[this.storageType];
                // When Safari (OS X or iOS) is in private browsing mode, it
                // appears as though localStorage is available, but trying to
                // call .setItem throws an exception.
                //
                // "QUOTA_EXCEEDED_ERR: DOM Exception 22: An attempt was made
                // to add something to storage that exceeded the quota."
                let key = this.deriveKey(`__${Math.round(Math.random() * 1e7)}`);
                this.webStorage.setItem(key, '');
                this.webStorage.removeItem(key);
            }
            return supported;
        }
        catch (e) {
            this.errors.next(e.message);
            return false;
        }
    }
    setPrefix(prefix) {
        this.prefix = prefix;
        // If there is a prefix set in the config let's use that with an appended
        // period for readability:
        const PERIOD = '.';
        if (this.prefix && !this.prefix.endsWith(PERIOD)) {
            this.prefix = !!this.prefix ? `${this.prefix}${PERIOD}` : '';
        }
    }
    setStorageType(storageType) {
        this.storageType = storageType;
    }
    setNotify(setItem, removeItem) {
        if (setItem != null) {
            this.notifyOptions.setItem = setItem;
        }
        if (removeItem != null) {
            this.notifyOptions.removeItem = removeItem;
        }
    }
}
LocalStorageService.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.2.9", ngImport: i0, type: LocalStorageService, deps: [{ token: LOCAL_STORAGE_SERVICE_CONFIG, optional: true }], target: i0.ɵɵFactoryTarget.Injectable });
LocalStorageService.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.2.9", ngImport: i0, type: LocalStorageService, providedIn: 'root' });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.2.9", ngImport: i0, type: LocalStorageService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [LOCAL_STORAGE_SERVICE_CONFIG]
                }] }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwtc3RvcmFnZS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xvY2FsLXN0b3JhZ2Uuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBSXZDLE9BQU8sRUFBOEIsNEJBQTRCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQzs7QUFFNUcsTUFBTSxVQUFVLEdBQVcsOEJBQThCLENBQUM7QUFDMUQsTUFBTSwyQkFBMkIsR0FBVyw2QkFBNkIsQ0FBQztBQUsxRSxNQUFNLE9BQU8sbUJBQW1CO0lBcUI1QixZQUNzRCxTQUFxQyxFQUFFO1FBckJ0RixnQkFBVyxHQUFZLEtBQUssQ0FBQztRQU81QixrQkFBYSxHQUFtQjtZQUNwQyxPQUFPLEVBQUUsS0FBSztZQUNkLFVBQVUsRUFBRSxLQUFLO1NBQ3BCLENBQUM7UUFDTSxXQUFNLEdBQVcsSUFBSSxDQUFDO1FBQ3RCLGdCQUFXLEdBQXNDLGNBQWMsQ0FBQztRQUdoRSxXQUFNLEdBQXVCLElBQUksVUFBVSxFQUFVLENBQUM7UUFDdEQsZ0JBQVcsR0FBbUMsSUFBSSxVQUFVLEVBQXNCLENBQUU7UUFDcEYsYUFBUSxHQUFtQyxJQUFJLFVBQVUsRUFBc0IsQ0FBQztRQUNoRixhQUFRLEdBQXVCLElBQUksVUFBVSxFQUFVLENBQUM7UUFLNUQsSUFBSSxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsTUFBTSxDQUFDO1FBRXBELElBQUksYUFBYSxJQUFJLElBQUksRUFBRTtZQUN2QixJQUFJLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLGFBQWEsQ0FBQztZQUM1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J0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgU3Vic2NyaWJlciB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgc2hhcmUgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7IElMb2NhbFN0b3JhZ2VFdmVudCB9IGZyb20gJy4vbG9jYWwtc3RvcmFnZS1ldmVudHMuaW50ZXJmYWNlJztcbmltcG9ydCB7IElOb3RpZnlPcHRpb25zIH0gZnJvbSAnLi9ub3RpZnktb3B0aW9ucy5pbnRlcmZhY2UnO1xuaW1wb3J0IHsgSUxvY2FsU3RvcmFnZVNlcnZpY2VDb25maWcsIExPQ0FMX1NUT1JBR0VfU0VSVklDRV9DT05GSUcgfSBmcm9tICcuL2xvY2FsLXN0b3JhZ2UuY29uZmlnLmludGVyZmFjZSc7XG5cbmNvbnN0IERFUFJFQ0FURUQ6IHN0cmluZyA9ICdUaGlzIGZ1bmN0aW9uIGlzIGRlcHJlY2F0ZWQuJztcbmNvbnN0IExPQ0FMX1NUT1JBR0VfTk9UX1NVUFBPUlRFRDogc3RyaW5nID0gJ0xPQ0FMX1NUT1JBR0VfTk9UX1NVUFBPUlRFRCc7XG5cbkBJbmplY3RhYmxlKHtcbiAgICBwcm92aWRlZEluOiAncm9vdCdcbn0pXG5leHBvcnQgY2xhc3MgTG9jYWxTdG9yYWdlU2VydmljZSB7XG4gICAgcHVibGljIGlzU3VwcG9ydGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBwdWJsaWMgZXJyb3JzJDogT2JzZXJ2YWJsZTxzdHJpbmc+O1xuICAgIHB1YmxpYyByZW1vdmVJdGVtcyQ6IE9ic2VydmFibGU8SUxvY2FsU3RvcmFnZUV2ZW50PjtcbiAgICBwdWJsaWMgc2V0SXRlbXMkOiBPYnNlcnZhYmxlPElMb2NhbFN0b3JhZ2VFdmVudD47XG4gICAgcHVibGljIHdhcm5pbmdzJDogT2JzZXJ2YWJsZTxzdHJpbmc+O1xuXG4gICAgcHJpdmF0ZSBub3RpZnlPcHRpb25zOiBJTm90aWZ5T3B0aW9ucyA9IHtcbiAgICAgICAgc2V0SXRlbTogZmFsc2UsXG4gICAgICAgIHJlbW92ZUl0ZW06IGZhbHNlXG4gICAgfTtcbiAgICBwcml2YXRlIHByZWZpeDogc3RyaW5nID0gJ2xzJztcbiAgICBwcml2YXRlIHN0b3JhZ2VUeXBlOiAnc2Vzc2lvblN0b3JhZ2UnIHwgJ2xvY2FsU3RvcmFnZScgPSAnbG9jYWxTdG9yYWdlJztcbiAgICBwcml2YXRlIHdlYlN0b3JhZ2U6IFN0b3JhZ2U7XG5cbiAgICBwcml2YXRlIGVycm9yczogU3Vic2NyaWJlcjxzdHJpbmc+ID0gbmV3IFN1YnNjcmliZXI8c3RyaW5nPigpO1xuICAgIHByaXZhdGUgcmVtb3ZlSXRlbXM6IFN1YnNjcmliZXI8SUxvY2FsU3RvcmFnZUV2ZW50PiA9IG5ldyBTdWJzY3JpYmVyPElMb2NhbFN0b3JhZ2VFdmVudD4oKSA7XG4gICAgcHJpdmF0ZSBzZXRJdGVtczogU3Vic2NyaWJlcjxJTG9jYWxTdG9yYWdlRXZlbnQ+ID0gbmV3IFN1YnNjcmliZXI8SUxvY2FsU3RvcmFnZUV2ZW50PigpO1xuICAgIHByaXZhdGUgd2FybmluZ3M6IFN1YnNjcmliZXI8c3RyaW5nPiA9IG5ldyBTdWJzY3JpYmVyPHN0cmluZz4oKTtcblxuICAgIGNvbnN0cnVjdG9yIChcbiAgICAgICAgQE9wdGlvbmFsKCkgQEluamVjdChMT0NBTF9TVE9SQUdFX1NFUlZJQ0VfQ09ORklHKSBjb25maWc6IElMb2NhbFN0b3JhZ2VTZXJ2aWNlQ29uZmlnID0ge31cbiAgICApIHtcbiAgICAgICAgbGV0IHsgbm90aWZ5T3B0aW9ucywgcHJlZml4LCBzdG9yYWdlVHlwZSB9ID0gY29uZmlnO1xuXG4gICAgICAgIGlmIChub3RpZnlPcHRpb25zICE9IG51bGwpIHtcbiAgICAgICAgICAgIGxldCB7IHNldEl0ZW0sIHJlbW92ZUl0ZW0gfSA9IG5vdGlmeU9wdGlvbnM7XG4gICAgICAgICAgICB0aGlzLnNldE5vdGlmeSghIXNldEl0ZW0sICEhcmVtb3ZlSXRlbSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByZWZpeCAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLnNldFByZWZpeChwcmVmaXgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdG9yYWdlVHlwZSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLnNldFN0b3JhZ2VUeXBlKHN0b3JhZ2VUeXBlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZXJyb3JzJCA9IG5ldyBPYnNlcnZhYmxlPHN0cmluZz4oKG9ic2VydmVyOiBTdWJzY3JpYmVyPHN0cmluZz4pID0+IHRoaXMuZXJyb3JzID0gb2JzZXJ2ZXIpLnBpcGUoc2hhcmUoKSk7XG4gICAgICAgIHRoaXMucmVtb3ZlSXRlbXMkID0gbmV3IE9ic2VydmFibGU8SUxvY2FsU3RvcmFnZUV2ZW50Pigob2JzZXJ2ZXI6IFN1YnNjcmliZXI8SUxvY2FsU3RvcmFnZUV2ZW50PikgPT4gdGhpcy5yZW1vdmVJdGVtcyA9IG9ic2VydmVyKS5waXBlKHNoYXJlKCkpO1xuICAgICAgICB0aGlzLnNldEl0ZW1zJCA9IG5ldyBPYnNlcnZhYmxlPElMb2NhbFN0b3JhZ2VFdmVudD4oKG9ic2VydmVyOiBTdWJzY3JpYmVyPElMb2NhbFN0b3JhZ2VFdmVudD4pID0+IHRoaXMuc2V0SXRlbXMgPSBvYnNlcnZlcikucGlwZShzaGFyZSgpKTtcbiAgICAgICAgdGhpcy53YXJuaW5ncyQgPSBuZXcgT2JzZXJ2YWJsZTxzdHJpbmc+KChvYnNlcnZlcjogU3Vic2NyaWJlcjxzdHJpbmc+KSA9PiB0aGlzLndhcm5pbmdzID0gb2JzZXJ2ZXIpLnBpcGUoc2hhcmUoKSk7XG5cbiAgICAgICAgdGhpcy5pc1N1cHBvcnRlZCA9IHRoaXMuY2hlY2tTdXBwb3J0KCk7XG4gICAgfVxuXG4gICAgcHVibGljIGFkZCAoa2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS53YXJuKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oREVQUkVDQVRFRCk7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VzZSBgTG9jYWxTdG9yYWdlU2VydmljZS5zZXRgIGluc3RlYWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgfVxuXG4gICAgcHVibGljIGNsZWFyQWxsIChyZWd1bGFyRXhwcmVzc2lvbj86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICAvLyBTZXR0aW5nIGJvdGggcmVndWxhciBleHByZXNzaW9ucyBpbmRlcGVuZGVudGx5XG4gICAgICAgIC8vIEVtcHR5IHN0cmluZ3MgcmVzdWx0IGluIGNhdGNoYWxsIFJlZ0V4cFxuICAgICAgICBsZXQgcHJlZml4UmVnZXggPSAhIXRoaXMucHJlZml4ID8gbmV3IFJlZ0V4cCgnXicgKyB0aGlzLnByZWZpeCkgOiBuZXcgUmVnRXhwKCcnKTtcbiAgICAgICAgbGV0IHRlc3RSZWdleCA9ICEhcmVndWxhckV4cHJlc3Npb24gPyBuZXcgUmVnRXhwKHJlZ3VsYXJFeHByZXNzaW9uKSA6IG5ldyBSZWdFeHAoJycpO1xuXG4gICAgICAgIGlmICghdGhpcy5pc1N1cHBvcnRlZCkge1xuICAgICAgICAgICAgdGhpcy53YXJuaW5ncy5uZXh0KExPQ0FMX1NUT1JBR0VfTk9UX1NVUFBPUlRFRCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcHJlZml4TGVuZ3RoID0gdGhpcy5wcmVmaXgubGVuZ3RoO1xuXG4gICAgICAgIGZvciAobGV0IGtleSBpbiB0aGlzLndlYlN0b3JhZ2UpIHtcbiAgICAgICAgICAgIC8vIE9ubHkgcmVtb3ZlIGl0ZW1zIHRoYXQgYXJlIGZvciB0aGlzIGFwcCBhbmQgbWF0Y2ggdGhlIHJlZ3VsYXIgZXhwcmVzc2lvblxuICAgICAgICAgICAgaWYgKHByZWZpeFJlZ2V4LnRlc3Qoa2V5KSAmJiB0ZXN0UmVnZXgudGVzdChrZXkuc3Vic3RyKHByZWZpeExlbmd0aCkpKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUoa2V5LnN1YnN0cihwcmVmaXhMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3JzLm5leHQoZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZGVyaXZlS2V5IChrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBgJHt0aGlzLnByZWZpeH0ke2tleX1gO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXQgPFQ+IChrZXk6IHN0cmluZyk6IFQge1xuICAgICAgICBpZiAoIXRoaXMuaXNTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgIHRoaXMud2FybmluZ3MubmV4dChMT0NBTF9TVE9SQUdFX05PVF9TVVBQT1JURUQpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgaXRlbSA9IHRoaXMud2ViU3RvcmFnZSA/IHRoaXMud2ViU3RvcmFnZS5nZXRJdGVtKHRoaXMuZGVyaXZlS2V5KGtleSkpIDogbnVsbDtcbiAgICAgICAgLy8gRklYTUU6IG5vdCBhIHBlcmZlY3Qgc29sdXRpb24sIHNpbmNlIGEgdmFsaWQgJ251bGwnIHN0cmluZyBjYW4ndCBiZSBzdG9yZWRcbiAgICAgICAgaWYgKCFpdGVtIHx8IGl0ZW0gPT09ICdudWxsJykge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoaXRlbSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGdldFN0b3JhZ2VUeXBlICgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5zdG9yYWdlVHlwZTtcbiAgICB9XG5cbiAgICBwdWJsaWMga2V5cyAoKTogQXJyYXk8c3RyaW5nPiB7XG4gICAgICAgIGlmICghdGhpcy5pc1N1cHBvcnRlZCkge1xuICAgICAgICAgICAgdGhpcy53YXJuaW5ncy5uZXh0KExPQ0FMX1NUT1JBR0VfTk9UX1NVUFBPUlRFRCk7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcHJlZml4TGVuZ3RoID0gdGhpcy5wcmVmaXgubGVuZ3RoO1xuICAgICAgICBsZXQga2V5czogQXJyYXk8c3RyaW5nPiA9IFtdO1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gdGhpcy53ZWJTdG9yYWdlKSB7XG4gICAgICAgICAgICAvLyBPbmx5IHJldHVybiBrZXlzIHRoYXQgYXJlIGZvciB0aGlzIGFwcFxuICAgICAgICAgICAgaWYgKGtleS5zdWJzdHIoMCwgcHJlZml4TGVuZ3RoKSA9PT0gdGhpcy5wcmVmaXgpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goa2V5LnN1YnN0cihwcmVmaXhMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXJyb3JzLm5leHQoZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5cztcbiAgICB9XG5cbiAgICBwdWJsaWMgbGVuZ3RoICgpOiBudW1iZXIge1xuICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICBsZXQgc3RvcmFnZSA9IHRoaXMud2ViU3RvcmFnZTtcbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IHN0b3JhZ2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChzdG9yYWdlLmtleShpKS5pbmRleE9mKHRoaXMucHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGNvdW50ICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgIH1cblxuICAgIHB1YmxpYyByZW1vdmUgKC4uLmtleXM6IEFycmF5PHN0cmluZz4pOiBib29sZWFuIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgICAgIGtleXMuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc1N1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMud2FybmluZ3MubmV4dChMT0NBTF9TVE9SQUdFX05PVF9TVVBQT1JURUQpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHRoaXMud2ViU3RvcmFnZS5yZW1vdmVJdGVtKHRoaXMuZGVyaXZlS2V5KGtleSkpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm5vdGlmeU9wdGlvbnMucmVtb3ZlSXRlbSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUl0ZW1zLm5leHQoe1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9yYWdlVHlwZTogdGhpcy5zdG9yYWdlVHlwZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lcnJvcnMubmV4dChlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0IChrZXk6IHN0cmluZywgdmFsdWU6IGFueSk6IGJvb2xlYW4ge1xuICAgICAgICAvLyBMZXQncyBjb252ZXJ0IGB1bmRlZmluZWRgIHZhbHVlcyB0byBgbnVsbGAgdG8gZ2V0IHRoZSB2YWx1ZSBjb25zaXN0ZW50XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5pc1N1cHBvcnRlZCkge1xuICAgICAgICAgICAgdGhpcy53YXJuaW5ncy5uZXh0KExPQ0FMX1NUT1JBR0VfTk9UX1NVUFBPUlRFRCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHRoaXMud2ViU3RvcmFnZSkge1xuICAgICAgICAgICAgICAgIHRoaXMud2ViU3RvcmFnZS5zZXRJdGVtKHRoaXMuZGVyaXZlS2V5KGtleSksIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLm5vdGlmeU9wdGlvbnMuc2V0SXRlbSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0SXRlbXMubmV4dCh7XG4gICAgICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgICAgICBuZXd2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHN0b3JhZ2VUeXBlOiB0aGlzLnN0b3JhZ2VUeXBlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMuZXJyb3JzLm5leHQoZS5tZXNzYWdlKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNoZWNrU3VwcG9ydCAoKTogYm9vbGVhbiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgc3VwcG9ydGVkID0gdGhpcy5zdG9yYWdlVHlwZSBpbiB3aW5kb3dcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgd2luZG93W3RoaXMuc3RvcmFnZVR5cGVdICE9PSBudWxsO1xuXG4gICAgICAgICAgICBpZiAoc3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53ZWJTdG9yYWdlID0gd2luZG93W3RoaXMuc3RvcmFnZVR5cGVdO1xuXG4gICAgICAgICAgICAgICAgLy8gV2hlbiBTYWZhcmkgKE9TIFggb3IgaU9TKSBpcyBpbiBwcml2YXRlIGJyb3dzaW5nIG1vZGUsIGl0XG4gICAgICAgICAgICAgICAgLy8gYXBwZWFycyBhcyB0aG91Z2ggbG9jYWxTdG9yYWdlIGlzIGF2YWlsYWJsZSwgYnV0IHRyeWluZyB0b1xuICAgICAgICAgICAgICAgIC8vIGNhbGwgLnNldEl0ZW0gdGhyb3dzIGFuIGV4Y2VwdGlvbi5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vIFwiUVVPVEFfRVhDRUVERURfRVJSOiBET00gRXhjZXB0aW9uIDIyOiBBbiBhdHRlbXB0IHdhcyBtYWRlXG4gICAgICAgICAgICAgICAgLy8gdG8gYWRkIHNvbWV0aGluZyB0byBzdG9yYWdlIHRoYXQgZXhjZWVkZWQgdGhlIHF1b3RhLlwiXG4gICAgICAgICAgICAgICAgbGV0IGtleSA9IHRoaXMuZGVyaXZlS2V5KGBfXyR7TWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMWU3KX1gKTtcbiAgICAgICAgICAgICAgICB0aGlzLndlYlN0b3JhZ2Uuc2V0SXRlbShrZXksICcnKTtcbiAgICAgICAgICAgICAgICB0aGlzLndlYlN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc3VwcG9ydGVkO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLmVycm9ycy5uZXh0KGUubWVzc2FnZSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHNldFByZWZpeCAocHJlZml4OiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wcmVmaXggPSBwcmVmaXg7XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBwcmVmaXggc2V0IGluIHRoZSBjb25maWcgbGV0J3MgdXNlIHRoYXQgd2l0aCBhbiBhcHBlbmRlZFxuICAgICAgICAvLyBwZXJpb2QgZm9yIHJlYWRhYmlsaXR5OlxuICAgICAgICBjb25zdCBQRVJJT0Q6IHN0cmluZyA9ICcuJztcbiAgICAgICAgaWYgKHRoaXMucHJlZml4ICYmICF0aGlzLnByZWZpeC5lbmRzV2l0aChQRVJJT0QpKSB7XG4gICAgICAgICAgICB0aGlzLnByZWZpeCA9ICEhdGhpcy5wcmVmaXggPyBgJHt0aGlzLnByZWZpeH0ke1BFUklPRH1gIDogJyc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHNldFN0b3JhZ2VUeXBlIChzdG9yYWdlVHlwZTogJ3Nlc3Npb25TdG9yYWdlJyB8ICdsb2NhbFN0b3JhZ2UnKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc3RvcmFnZVR5cGUgPSBzdG9yYWdlVHlwZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNldE5vdGlmeSAoc2V0SXRlbTogYm9vbGVhbiwgcmVtb3ZlSXRlbTogYm9vbGVhbik6IHZvaWQge1xuICAgICAgICBpZiAoc2V0SXRlbSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLm5vdGlmeU9wdGlvbnMuc2V0SXRlbSA9IHNldEl0ZW07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlbW92ZUl0ZW0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5ub3RpZnlPcHRpb25zLnJlbW92ZUl0ZW0gPSByZW1vdmVJdGVtO1xuICAgICAgICB9XG4gICAgfVxufVxuIl19