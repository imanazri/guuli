/** See metro.js — Metro config helper for consuming Guli from a local path. */
export declare const SINGLETONS: string[];
export declare function withGuli<T extends Record<string, unknown>>(
	config: T,
	options?: {
		/** Defaults to `config.projectRoot`, then `process.cwd()`. */
		projectRoot?: string;
		/** The linked package directory, when you linked source rather than a tarball. */
		linkedRoot?: string;
		/** Override which packages are forced to a single copy. */
		singletons?: string[];
	},
): T;
