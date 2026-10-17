export declare const DEPARTMENTS: readonly ["Sales", "Operations", "Development", "Finance", "Support"];
export type Department = (typeof DEPARTMENTS)[number];
export declare const ASSIGNABLE_DEPARTMENT: Department;
export declare function cleanDepartments(input: unknown): Department[];
export declare const effectiveDepartments: (own?: string[] | null, fromRole?: string[] | null) => string[];
//# sourceMappingURL=departments.d.ts.map