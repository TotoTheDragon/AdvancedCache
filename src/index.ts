import moment, { Duration, Moment } from "moment";
import { setTimeout } from "timers";

export class Cache<T> {

    protected cacheDuration: Duration;
    protected cache: Map<string, T>;
    protected cacheMeta: Map<string, CacheMeta>;

    protected pending: Map<string, Promise<T>>;

    protected cleanInterval: Duration;
    protected cleanerTask: NodeJS.Timeout;

    constructor(options?: CacheOptions) {
        this.cacheDuration = options?.cacheDuration ?? moment.duration(2, "hour");

        this.cache = new Map();
        this.cacheMeta = new Map();
        this.pending = new Map();

        this.cleanInterval = options?.autoCleanInterval ?? moment.duration(1, "minute");
        if (options?.autoClean)
            this.startClean();
    }

    get size(): number {
        return this.cache.size;
    }


    /* Method for override */
    init(): void { };

    get(key: string): T | Promise<T> {

        /* Not valid anymore */
        if (this.getCacheMeta(key)?.validUntil?.isBefore(moment())) {
            this.cacheMeta.delete(key);
            this.cache.delete(key);
            this.pending.delete(key);
            return undefined;
        }

        return this.cache.get(key) ?? this.pending.get(key);
    }

    getCacheMeta(key: string): CacheMeta {
        return this.cacheMeta.get(key);
    }

    has(key: string): boolean {
        const meta = this.getCacheMeta(key);
        return Boolean(meta) && (this.cache.has(key) || this.pending.has(key)) && meta.validUntil.isAfter(moment());
    }

    add(key: string, object: T | Promise<T>) {
        /* Handle if object is promise */
        if (object instanceof Promise) {
            this.pending.set(key, object);
            this.cacheMeta.set(key, { cachedAt: moment(), validUntil: moment().add(this.cacheDuration) });
            object.then(
                obj => {
                    /* Object resolved, move to cache */
                    this.pending.delete(key); // Remove from promise cache
                    this.cache.set(key, obj); // Add to normal cache
                },
                () => {
                    /* Object rejected, delete from cache */
                    this.pending.delete(key); // Remove from promise cache
                    this.cacheMeta.delete(key); // Remove cacheMeta
                });
            return;
        }

        /* Handle if object is object */
        this.cache.set(key, object);
        this.cacheMeta.set(key, { cachedAt: moment(), validUntil: moment().add(this.cacheDuration) });
    }

    remove(key: string): void {
        this.cache.delete(key);
        this.cacheMeta.delete(key);
        this.pending.delete(key);
    }

    clear(): void {
        this.cache = new Map();
        this.cacheMeta = new Map();
        this.pending = new Map();
    }

    clean(): void {
        this.cacheMeta.forEach((meta, key) => {
            if (meta.validUntil.isBefore(moment()))
                this.remove(key);
        });
    }

    protected startClean() {
        if (this.cleanerTask) return; // Cleaner task already exists
        const clean = () => {
            this.clean();
            this.cleanerTask = setTimeout(() => clean(), this.cleanInterval.milliseconds())
        }
        clean();
    }

    values(): T[] {
        return Array.from(this.cache.values());
    }

    promises(): string[] {
        return Array.from(this.pending.keys());
    }
}

export interface CacheOptions {
    cacheDuration?: Duration;
    autoClean?: boolean;
    autoCleanInterval?: Duration;
}

export interface CacheMeta {
    cachedAt: Moment,
    validUntil: Moment,
    lastAccessed?: Moment
}