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

/**
 * TODO: (general):
 *  - Remove `console.log` statements and add config for logging output
 *  - Add test fail results to view model so that user can understand why they don't plot
 *  - Add XY chart handling
 */

import 'core-js/stable';
import './../style/visual.less';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import * as d3 from 'd3';
import * as chartXkcd from 'chart.xkcd';
import { IXkcdChartBase } from './interfaces';
import { VisualSettings } from './settings';
import { EXYChartMappingType } from './enums';

export class Visual implements IVisual {
    private target: HTMLElement;
    private settings: VisualSettings;
    private svgNode: d3.Selection<SVGElement, any, any, any>;

    /**
     * Runs when visual is instantiated
     *
     * @param options   Visual constructor options
     */
        constructor(options: VisualConstructorOptions) {
            console.log('Visual constructor', options);
            this.target = options.element;
            this.svgNode = d3.select(this.target)
            .append('svg')
            .classed('xkcd', true);
        }

    /**
     * Runs when visual is updated
     *
     * @param options   Visual update options
     */
        public update(options: VisualUpdateOptions) {
            this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
            console.log('Visual update', options);

            /** Clear down existing plot */
                this.svgNode
                    .selectAll('*')
                    .remove();

            /** Prep spec and target node for plot */
                let spec = this.mapSpec(options),
                    svg = this.svgNode.node();
                console.log('Spec', spec);

            /** Call appropriate plot functionbased on chart type */
                switch (this.settings.coreParameters.chartType) {
                    case 'Bar': {
                        new chartXkcd.Bar(svg, spec);
                        break;
                    }
                    case 'Pie': {
                        new chartXkcd.Pie(svg, spec);
                        break;
                    }
                    case 'Line': {
                        new chartXkcd.Line(svg, spec);
                    }
                }

            console.log('Done!');
        }

    /**
     * Looks in the `dataView` columns list for the specified role name. If found, returns the object if one found; null if not found.
     *
     * @param dataViewColumns   Array of `DataViewMetaDataColumn`s to inspect
     * @param dataRole          Name of role being searched for
     */
        private getDataRoleByName(dataViewColumns: DataViewMetadataColumn[], dataRole: string): DataViewMetadataColumn {
            /** Filter for role name in columns */
                let result = dataViewColumns.filter(
                        (col) => col.roles[dataRole]
                    );
            /** We need exactly one match. If we get that, give the index back, otherwise we don't have
             *  a valid index */
                return result && result.length === 1
                    ?   result[0]
                    :   null;
        }

    /**
     * Generates a valid 'spec' for the chart.xkcd definition.
     *
     * @param options Visual Update Options from `update` methos
     */
        private mapSpec(options: VisualUpdateOptions): IXkcdChartBase {

            /** Determine if dataview is valid */
                let dataViews = options.dataViews;

            /** Test 1: Data view has valid bare-minimum entries */
                console.log('Test 1: Valid data view...');
                if (!dataViews
                    || !dataViews[0]
                    || !dataViews[0].categorical
                    || !dataViews[0].metadata
                ) {
                    console.log('Test 1 FAILED. Returning bare-minimum view model.');
                    return;
                }
                console.log('Test 1 PASSED :)');

            /** Obtain data view objects so we can test for correct fields */
                let metadata = dataViews[0].metadata.columns,
                    categorical = dataViews[0].categorical,
                    measures = metadata.filter((col) =>
                                col.roles['measure']
                            &&  !col.groupName
                        ),
                    measureCount = measures.length,
                    category = this.getDataRoleByName(metadata, 'category'),
                    series = this.getDataRoleByName(metadata, 'series');

            /** Flags we can use in test 2 to define chart behaviour for spec */
                let isCartesian: boolean,
                    xyMappingType: EXYChartMappingType;

            /** Test 2: Data view mapping matches requirements for chart type
             *      Bar:    (1) 1 category and 1 measure; no series
             *      Pie:    (1) 1 category and 1 measure; no series
             *      Line:   (1) 1 category, 1 measure and 1 series
             *              (2) 1 category, >= 1 measure and no series
             *      XY:     (1) 0 or 1 series, 2 measures
             *              (2) 0 or 1 series, 1 measure, 1 grouping (in measure)
             *              (3) 0 or 1 series, 2 groupings (in measure)
             *
             */
                console.log('Test 2: Valid data roles for chart type...');
                switch (this.settings.coreParameters.chartType) {
                    case 'Bar': {
                        isCartesian = true;
                        switch (true) {
                            case (category && measureCount === 1 && !series): {
                                console.log('Test 2 PASSED for Bar chart.');
                                break;
                            }
                            default: {
                                console.log('Test 2 FAILED. Fields not valid for Bar chart.');
                                return;
                            }
                        }
                        break;
                    }
                    case 'Pie': {
                        switch (true) {
                            case (category && measureCount === 1 && !series): {
                                console.log('Test 2 PASSED for Pie chart.');
                                break;
                            }
                            default: {
                                console.log('Test 2 FAILED. Fields not valid for Pie chart.');
                                return;
                            }
                        }
                        break;
                    }
                    case 'Line': {
                        isCartesian = true;
                        switch (true) {
                            case (category && measureCount === 1):
                            case (category && series && measureCount === 1):
                            case (category && !series && measureCount > 1): {
                                console.log('Test 2 PASSED for Line chart.');
                                break;
                            }
                            default: {
                                console.log('Test 2 FAILED. Fields not valid for Line chart.');
                                return;
                            }
                        }
                        break;
                    }
                    case 'XY': {
                        console.log('Measures', measureCount);
                        isCartesian = true;
                        switch (true) {
                            case (!category && measureCount === 2): {
                                xyMappingType = EXYChartMappingType.NoSeriesAndMeasures;
                                console.log('Test 2 PASSED for XY chart - no series, 2 measures.');
                                break;
                            }
                            case (!category && series && measureCount === 2): {
                                xyMappingType = EXYChartMappingType.SeriesAndMeasures
                                console.log('Test 2 PASSED for XY chart - 1 series, 2 measures.');
                                break;
                            }
                            default: {
                                console.log('Test 2 FAILED. Fields not valid for XY chart.');
                                return;
                            }
                        }
                        break;
                    }
                }

            /** Assemble spec for chart */
                let chartConfig = this.settings.coreParameters,
                    hasTitle: boolean = (chartConfig.showTitle && chartConfig.titleText !== null && chartConfig.titleText !== ''),
                    spec: IXkcdChartBase = {
                        data: {}
                    };

                /** Title and axes */
                    if (hasTitle) {
                        spec.title = this.settings.coreParameters.titleText;
                    }
                    if (isCartesian) {
                        spec.xLabel = chartConfig.xLabel
                            ?   chartConfig.xLabel
                            :   category
                                ?   category.displayName
                                :   '';
                        spec.yLabel = chartConfig.yLabel
                            ?   chartConfig.yLabel
                                :   measures && measureCount >= 1
                                    ?   measures[0].displayName
                                    :   '';
                    }

                /** Map options */

                    /** Resolve as generically as possible to avoid repeating logic i nthe `switch` below */
                        console.log('Resolving options...');
                        let xTickCount = this.settings.chartOptions.yTickCount || VisualSettings.getDefault()['chartOptions'].xTickCount,
                            yTickCount = this.settings.chartOptions.yTickCount || VisualSettings.getDefault()['chartOptions'].yTickCount,
                            legendPosition = this.settings.chartOptions.legendPosition || 1,
                            showLine = this.settings.chartOptions.showLine,
                            timeFormat = this.settings.chartOptions.timeFormat,
                            dotSize = this.settings.chartOptions.yTickCount || VisualSettings.getDefault()['chartOptions'].dotSize,
                            innerRadius = (
                                    this.settings.chartOptions.innerPadding === 0
                                        ?   0
                                        :       this.settings.chartOptions.innerPadding
                                            ||  VisualSettings.getDefault()['chartOptions'].innerPadding
                                ) / 100;

                    /** Add in options as needed */
                        console.log('Mapping options...');
                        switch (chartConfig.chartType) {
                            case 'Bar': {
                                spec.options = {
                                    yTickCount: yTickCount
                                };
                                break;
                            }
                            case 'Pie': {
                                spec.options = {
                                    legendPosition: legendPosition,
                                    innerRadius: innerRadius
                                };
                            }
                            case 'Line': {
                                spec.options = {
                                    yTickCount: yTickCount,
                                    legendPosition: legendPosition
                                };
                                break;
                            }
                            case 'XY': {
                                spec.options = {
                                    xTickCount: xTickCount,
                                    yTickCount: yTickCount,
                                    legendPosition: legendPosition,
                                    showLine: showLine,
                                    timeFormat: timeFormat,
                                    dotSize: dotSize
                                }
                                break;
                            }
                        }

                /** Map data from `dataView` */
                    console.log('Mapping data...');
                    let catLabels = categorical.categories[0].values.map((v) => v.toString());
                    switch (chartConfig.chartType) {
                        case 'Bar':
                        case 'Pie': {
                            console.log(`${chartConfig.chartType}: mapping by category/measure`);
                            spec.data = {
                                labels: catLabels,
                                datasets: [
                                    {
                                        data: categorical.values[0].values.map((v) => {
                                            return <number>v;
                                        })
                                    }
                                ]
                            };
                            break;
                        }
                        case 'Line': {
                            console.log(`Line chart: mapping by ${series ? 'series' : 'measure'}...`);
                            spec.data = {
                                labels: catLabels,
                                datasets: categorical.values.map((v) => ({
                                        label: series
                                            ?   v.source.groupName.toString()
                                            :   v.source.displayName.toString(),
                                        data: <number[]>v.values
                                    })
                                )
                            };
                            break;
                        }
                        case 'XY': {
                            console.log(`XY chart: mapping by whatever crazy combination we're doing`);
                        }
                    }

            return spec;
        }

    private static parseSettings(dataView: DataView): VisualSettings {
        return VisualSettings.parse(dataView) as VisualSettings;
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            const instances: VisualObjectInstance[] = (VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options) as VisualObjectInstanceEnumerationObject).instances;
            let objectName = options.objectName;

            switch (objectName) {

                case 'coreParameters': {
                    if (!this.settings.coreParameters.showTitle) {
                        delete instances[0].properties['titleText'];
                    }
                    switch (this.settings.coreParameters.chartType) {
                        case 'Pie': {
                            delete instances[0].properties['xLabel'];
                            delete instances[0].properties['yLabel'];
                        }
                        break;
                    }
                    break;
                }

                case 'chartOptions': {
                    /** Range validation on int fields */
                        instances[0].validValues = instances[0].validValues || {};
                        instances[0].validValues.xTickCount =
                        instances[0].validValues.yTickCount = 
                        instances[0].validValues.dotSize = {
                            numberRange: {
                                min: 1,
                                max: 10
                            }
                        };
                        instances[0].validValues.innerPadding = {
                            numberRange: {
                                min: 0,
                                max: 100
                            }
                        };

                    /** Remove chart-type-specific options */
                        switch (this.settings.coreParameters.chartType) {
                            case 'Bar': {
                                delete instances[0].properties['xTickCount'];
                                delete instances[0].properties['legendPosition'];
                                delete instances[0].properties['innerPadding'];
                                delete instances[0].properties['showLine'];
                                delete instances[0].properties['timeFormat'];
                                delete instances[0].properties['dotSize'];
                                break;
                            }
                            case 'Pie': {
                                delete instances[0].properties['xTickCount'];
                                delete instances[0].properties['yTickCount'];
                                delete instances[0].properties['showLine'];
                                delete instances[0].properties['timeFormat'];
                                delete instances[0].properties['dotSize'];
                                break;
                            }
                            case 'Line': {
                                delete instances[0].properties['xTickCount'];
                                delete instances[0].properties['innerPadding'];
                                delete instances[0].properties['showLine'];
                                delete instances[0].properties['timeFormat'];
                                delete instances[0].properties['dotSize'];
                                break;
                            }
                            case 'XY': {
                                delete instances[0].properties['innerPadding'];
                            }
                        }
                }

            }

            return instances;
        }
}