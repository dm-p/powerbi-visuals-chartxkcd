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

import { EPositionType } from './enums';

/**
 * Simple interface to manage the overall xkcd.chart 'spec'
 */
    export interface IXkcdChartBase {
        title?: string;
        xLabel?: string;
        yLabel?: string;
        options?: IXkcdChartOptions;
        data: IXkcdChartData;
    }

/**
 * Interface to manage the mapping of the `options` object keys/values
 */
    export interface IXkcdChartOptions {
        xTickCount?: number;
        yTickCount?: number;
        legendPosition?: EPositionType;
        showLine?: boolean;
        timeFormat?: string;
        dotSize?: number;
        innerRadius?: number;
    }

/**
 * Interface to manage the mapping of the `data` object
 */
    export interface IXkcdChartData {
        labels?: string[];
        datasets?: IXkcdChartDataSet[];
    }

/**
 * Interface to manage the array of `datasets` objects that can be provided in `data`
 */
    export interface IXkcdChartDataSet {
        label?: string;
        data: number[];
    }