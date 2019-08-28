/**
 * Used to handle debugging, if enabled within the visual settings
 */
    export class VisualDebugger {

        /** Indicates whether debugger is enabled (set by properties) */
            enabled: boolean = false;

            constructor(condition: boolean) {
                this.enabled = condition;
            }

        /** Clears the console if debugging is enabled */
            clear() {
                if (this.enabled) {
                    console.clear();
                }
            }

        /**
         * Create a heading within the browser console, if debugging is enabled
         * @param heading Text to display in the heading
         */
            heading(heading: string) {
                if (this.enabled) {
                    console.log(`\n====================\n${heading}\n====================`);
                }
            }

        /** Create a footer if debugging is enabled, allowing you to demark sections within the console */
            footer() {
                if (this.enabled) {
                    console.log(`====================`);
                }
            }

        /**
         * Write out the supplied args to the console, with tabbing
         * @param args Any items to output, separated by a comma, like for `console.log()`
         */
            log(...args: any[]) {
                if (this.enabled) {
                    console.log('|\t', ...args);
                }
            }

    }