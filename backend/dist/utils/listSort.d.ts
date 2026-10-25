export type SortDir = 'ASC' | 'DESC';
export type SortMap = Record<string, string>;
export declare function resolveSort(sortBy: unknown, sortDir: unknown, allowed: SortMap, fallbackKey: string, fallbackDir?: SortDir): {
    column: string;
    dir: SortDir;
};
//# sourceMappingURL=listSort.d.ts.map