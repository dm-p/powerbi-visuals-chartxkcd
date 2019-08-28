/*
*  chart.xkcd for Power BI
*
*  Copyright (c) Daniel Marsh-Patrick
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/

/** Power BI API references */
    import { dataViewObjectsParser } from 'powerbi-visuals-utils-dataviewutils';
    import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

/** Internal references */
    import {
        VISUAL_NAME,
        VISUAL_VERSION,
        VISUAL_CHARTXKCD_VERSION,
        VISUAL_USAGE_URL,
        VISUAL_NON_PRODUCTION
    } from './constants';

    /** Provides all visual property settings and defaults */
        export class VisualSettings extends DataViewObjectsParser {
            public coreParameters: CoreParameterSettings = new CoreParameterSettings();
            public chartOptions: ChartOptionSettings = new ChartOptionSettings();
            public about: AboutSettings = new AboutSettings();
        }

    /** Provides mapping of core parameters for chart.xkcd */
        export class CoreParameterSettings {
            public chartType: string = 'Bar';
            public showTitle: boolean = false;
            public titleText: string = null;
            public xLabel: string = null;
            public yLabel: string = null;
        }

    /** Provides mapping of the `options` object keys for chart types */
        export class ChartOptionSettings {
            public xTickCount: number = 3;
            public yTickCount: number = 3;
            public legendPosition: number = 1;
            public showLine: boolean = false;
            public timeFormat: string = undefined;
            public dotSize: number = 1;
            public innerPadding: number = 50;
        }

    /** Used to hold about info and manage debugging */
        export class AboutSettings {
            /** Name of visual */
                public visualName: string = VISUAL_NAME;
            /** Visual version */
                public version: string = VISUAL_VERSION;
            /** chart.Xckd library version */
                public chartXkcdVersion: string = VISUAL_CHARTXKCD_VERSION;
            /** Indicates whether debug mode is enabled or not */
                public debugMode: boolean = false;
            /** Indicates that visual update events should be debugged */
                public debugVisualUpdate: boolean = false;
            /** Indicates that visual property events should be debugged */
                public debugProperties: boolean = false;
            /** Indicates that visual is in a development (non-production) state */
                public development: boolean = VISUAL_NON_PRODUCTION;
            /** URL for help/usage instructions */
                public usageUrl: string = VISUAL_USAGE_URL;
        }    

