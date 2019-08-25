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
 * TODO (general):
 *  - Remove `console.log` statements and add config for logging output
 *  - Add Line chart handling
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
import { EPositionType } from './enums';

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
                }

            console.log('Done!');
        }

    /**
     * Looks in the `dataView` columns list for the specified role name. If found, returns the object; null if not found.
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
                    || !dataViews[0].categorical.categories
                    || !dataViews[0].categorical.values
                    || !dataViews[0].metadata
                ) {
                    console.log('Test 1 FAILED. Returning bare-minimum view model.');
                    return;
                }
                console.log('Test 1 PASSED :)');

            /** Obtain data view objects so we can test for correct fields */
                let metadata = dataViews[0].metadata.columns,
                    categorical = dataViews[0].categorical,
                    category = this.getDataRoleByName(metadata, 'category'),
                    measure = this.getDataRoleByName(metadata, 'measure');
                    /** TODO: # of measures */

            /** Flags we can use in test 2 to define chart behaviour for spec */
                let isCartesian: boolean;

            /** Test 2: Data view mapping matches requirements for chart type
             *      Bar:    (1) 1 category and 1 measure; no series
             *      Pie:    (1) 1 category and 1 measure; no series
             *      Line:   (1) 1 category, 1 measure and 1 series
             *              (2) 1 category, >= 1 measure and no series
             *      XY:     (1) 1 series, 2 measures
             *
             */
                console.log('Test 2: Valid data roles for chart type...');
                switch (this.settings.coreParameters.chartType) {
                    case 'Bar': {
                        isCartesian = true;
                        if (!(categorical && measure)) {
                            console.log('Test 2 FAILED. Fields not valid for Bar chart.');
                            return;
                        }
                        console.log('Test 2 PASSED for Bar chart.');
                        break;
                    }
                    case 'Pie': {
                        if (!(categorical && measure)) {
                            console.log('Test 2 FAILED. Fields not valid for Pie chart.');
                            return;
                        }
                        console.log('Test 2 PASSED for Pie chart.');
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
                                :   measure
                                    ?   measure.displayName
                                    :   '';
                    }

                /** Map options */
                    switch (chartConfig.chartType) {
                        case 'Bar': {
                            spec.options = {
                                yTickCount: this.settings.chartOptions.yTickCount || VisualSettings.getDefault()['chartOptions'].yTickCount
                            };
                            break;
                        }
                        case 'Pie': {
                            console.log('Padding', this.settings.chartOptions.innerPadding);
                            spec.options = {
                                legendPosition: this.settings.chartOptions.legendPosition || 1,
                                innerRadius: (
                                            this.settings.chartOptions.innerPadding === 0
                                                ?   0
                                                :       this.settings.chartOptions.innerPadding
                                                    ||  VisualSettings.getDefault()['chartOptions'].innerPadding
                                    ) / 100
                            };
                        }
                    }

                /** Map data from `dataView` */
                    switch (chartConfig.chartType) {
                        case 'Bar':
                        case 'Pie': {
                            spec.data = {
                                labels: categorical.categories[0].values.map((v) => {
                                    return v.toString();
                                }),
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
                    instances[0].validValues.yTickCount = {
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
                            delete instances[0].properties['legendPosition'];
                            delete instances[0].properties['innerPadding'];
                            break;
                        }
                        case 'Pie': {
                            delete instances[0].properties['yTickCount'];
                            break;
                        }
                    }
            }

        }

        return instances;
    }
}