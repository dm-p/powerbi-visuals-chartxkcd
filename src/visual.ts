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
 *  - Add XY chart handling
 *  - XY: manage non-summarized category
 */

 /** Power BI API references */
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
    import ILocalizationManager = powerbi.extensibility.ILocalizationManager;

/** External dependencies */
    import * as d3 from 'd3';
    import * as chartXkcd from 'chart.xkcd';

/** Internal references */
    import { VisualDebugger } from './VisualDebugger';
    import { IViewModel, IXkcdChartDataSetXY } from './interfaces';
    import { VisualSettings } from './settings';
    import { EXYChartMappingType } from './enums';

    export class Visual implements IVisual {

        /** The root element for the entire visual */
            private customVisualContainer: HTMLElement;
        /** The element we create for our chart.xkcd object */
            private svgContainer: d3.Selection<SVGElement, any, any, any>;
        /** The element used to contain the legend and violin plot */
            private plotErrorContainer: d3.Selection<HTMLDivElement, any, any, any>;
        /** Parsed settings from visual objects/properties pane */
            private settings: VisualSettings;
        /** Handle localisation of visual text */
            private localisationManager: ILocalizationManager;

        /**
         * Runs when visual is instantiated
         *
         * @param options   Visual constructor options
         */
            constructor(options: VisualConstructorOptions) {
                console.log('Visual constructor', options);
                this.localisationManager = options.host.createLocalizationManager();
                this.customVisualContainer = options.element;
                this.plotErrorContainer = d3.select(this.customVisualContainer)
                    .append('div')
                    .classed('plotErrors', true);
                this.svgContainer = d3.select(this.customVisualContainer)
                    .append('svg')
                    .classed('xkcdSvg', true);
            }

        /**
         * Runs when visual is updated
         *
         * @param options   Visual update options
         */
            public update(options: VisualUpdateOptions) {
                this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
                let debug = new VisualDebugger(this.settings.about.debugMode && this.settings.about.debugVisualUpdate);
                debug.clear();
                debug.heading('Visual Update');
                debug.log(`Update type: ${options.type}`);
                debug.log('Settings', this.settings);
                debug.footer();

                /** Clear down existing plot */
                    this.svgContainer
                        .attr('visibility', 'visible')
                        .selectAll('*')
                        .remove();
                    this.plotErrorContainer
                        .attr('visibility', 'hidden')
                        .selectAll('*')
                        .remove();

                /** Prep spec and target node for plot */
                    let viewModel = this.visualTransform(options),
                        svg = this.svgContainer.node();
                    debug.log('View Model', viewModel);
                    debug.footer();

                /** Manage errors vs. success */
                    if (viewModel.testResult.result) {
                        debug.log('Tests and spec are valid. Plotting visual...');
                        switch (this.settings.coreParameters.chartType) {
                            case 'Bar': {
                                new chartXkcd.Bar(svg, viewModel.spec);
                                break;
                            }
                            case 'Pie': {
                                new chartXkcd.Pie(svg, viewModel.spec);
                                break;
                            }
                            case 'Line': {
                                new chartXkcd.Line(svg, viewModel.spec);
                                break;
                            }
                            case 'XY': {
                                new chartXkcd.XY(svg, viewModel.spec);
                                break;
                            }
                        }
                    } else {
                        debug.log('Tests and spec are not valid. Reporting errors...');
                        this.svgContainer.attr('visibility', 'hidden');
                        this.plotErrorContainer.attr('visibility', 'visible');

                        /** Add heading */
                            this.plotErrorContainer
                                    .append('div')
                                        .classed('heading', true)
                                    .append('h2')
                                        .text(this.localisationManager.getDisplayName('Visual_Test_Error_Heading'));

                        /** Add error messages - we've built in some limited support for <ul> and <li> tag 'markup' in the stringResources... */
                            let messages = this.plotErrorContainer
                                    .append('div')
                                        .classed('messages', true);

                            messages.selectAll('*')
                                .data(viewModel.testResult.messages)
                                .enter()
                                .append('div')
                                .html((d) => `<p>${d.replace(/{(\/?ul|\/?li)}/gi, '<$1>')}</p>`);
                    }

                /** That's all, folks! */
                    debug.log('Done!');
                    debug.footer();
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
            private visualTransform(options: VisualUpdateOptions): IViewModel {

                /** Debugging */
                    let debug = new VisualDebugger(this.settings.about.debugMode && this.settings.about.debugVisualUpdate);

                /** Create "bare-minimum" view model */
                    debug.log('Creating template view model...');
                    let viewModel: IViewModel = {
                        spec: {
                            data: {}
                        },
                        testResult: {
                            result: false,
                            messages: []
                        }
                    };

                /** Determine if dataview is valid */
                    let dataViews = options.dataViews;

                /** Abstract pushing of errors into view model message array */
                    let pushError = (resourceKey: string) => {
                        debug.log('Adding error message to view model...');
                        viewModel.testResult.messages.push(this.localisationManager.getDisplayName(resourceKey));
                    };

                /** Test 1: Data view has valid bare-minimum entries */
                    debug.log('Test 1: Valid data view...');
                    if (!dataViews
                        || !dataViews[0]
                        || !dataViews[0].matrix
                        || !dataViews[0].metadata
                    ) {
                        pushError('Visual_Test_Error_001');
                        debug.log('Test 1 FAILED. Returning bare-minimum view model.');
                        return viewModel;
                    }
                    debug.log('Test 1 PASSED :)');

                /** Obtain data view objects so we can test for correct fields */
                    let metadata = dataViews[0].metadata.columns,
                        matrix = dataViews[0].matrix,
                        measures = matrix.valueSources.length > 0
                            ?   matrix.valueSources.filter((m) => !m.roles.category)
                            :   [this.getDataRoleByName(metadata, 'measure')] || null,
                        measureCount = measures.filter((m) => m !== null).length,
                        category = this.getDataRoleByName(metadata, 'category'),
                        series = this.getDataRoleByName(metadata, 'series');

                        debug.log('Category', category);
                        debug.log('Series', series);
                        debug.log('Measures', measures, measureCount);
                        debug.log('valueSources', matrix.valueSources.length);

                /** Flags we can use in test 2 to define chart behaviour for spec */
                    let isCartesian: boolean,
                        xyMappingType: EXYChartMappingType;

                /** Test 2: Data view mapping matches requirements for chart type
                 *      Bar:    (1) 1 category and 1 measure; no series
                 *      Pie:    (1) 1 category and 1 measure; no series
                 *      Line:   (1) 1 category, 1 measure and 1 series
                 *              (2) 1 category, >= 1 measure and no series
                 *      XY:     (1) category must be numeric or dateTime
                 *              (2) 1 category, 1 measure, 0-1 series
                 *
                 */
                    debug.footer();
                    debug.log('Test 2: Valid data roles for chart type...');
                    switch (this.settings.coreParameters.chartType) {
                        case 'Bar': {
                            isCartesian = true;
                            switch (true) {
                                case    (category && measureCount === 1 && !series): {
                                    break;
                                }
                                default: {
                                    pushError('Visual_Test_Error_002');
                                    debug.log('Test 2 FAILED. Fields not valid for Bar chart.');
                                    return viewModel;
                                }
                            }
                            debug.log('Test 2 PASSED for Bar chart.');
                            break;
                        }
                        case 'Pie': {
                            switch (true) {
                                case    (category && measureCount === 1 && !series): {
                                    break;
                                }
                                default: {
                                    pushError('Visual_Test_Error_003');
                                    debug.log('Test 2 FAILED. Fields not valid for Pie chart.');
                                    return viewModel;
                                }
                            }
                            debug.log('Test 2 PASSED for Pie chart.');
                            break;
                        }
                        case 'Line': {
                            isCartesian = true;
                            switch (true) {
                                case    (category && measureCount === 1):
                                case    (category && series && measureCount === 1):
                                case    (category && !series && measureCount > 1): {
                                    break;
                                }
                                default: {
                                    pushError('Visual_Test_Error_004');
                                    debug.log('Test 2 FAILED. Fields not valid for Line chart.');
                                    return viewModel;
                                }
                            }
                            debug.log('Test 2 PASSED for Line chart.');
                            break;
                        }
                        case 'XY': {
                            isCartesian = true;
                            switch (true) {
                                /** Numeric/date category, 1+ measures and no series */
                                    case    (category.type.numeric || category.type.dateTime)
                                        &&  (!series)
                                        &&  (measureCount >= 1)
                                        &&  (measures.filter((m) => m.isMeasure).length === measureCount): {
                                            debug.log('Test 2: XY = CatMeasures');
                                            xyMappingType = EXYChartMappingType.CatMeasures;
                                            break;
                                        }
                                /** Numeric/date category, 1 measure and 1 series */
                                    case    (category.type.numeric || category.type.dateTime)
                                        &&  (series)
                                        &&  (measureCount === 1)
                                        &&  (measures.filter((m) => m.isMeasure).length === measureCount): {
                                            debug.log('Test 2: XY = CatMeasureSeries');
                                            xyMappingType = EXYChartMappingType.CatMeasureSeries;
                                            break;
                                        }
                                /** Numeric/data category, 1 measure set to group, and group is numeric */
                                    case    (category.type.numeric || category.type.dateTime)
                                        &&  (!series)
                                        &&  (measureCount === 1)
                                        &&  (!measures[0].isMeasure)
                                        &&  (measures[0].type.numeric): {
                                            debug.log('Test 2: XY = CatMeasureCat');
                                            xyMappingType = EXYChartMappingType.CatMeasureCat;
                                            break;
                                        }
                                default: {
                                    pushError('Visual_Test_Error_005');
                                    debug.log('Test 2 FAILED. Invalid category type supplied for XY chart.');
                                    return viewModel;
                                }
                            }
                            debug.log('Test 2 PASSED for XY chart.');
                            break;
                        }
                    }

                /** Assemble spec for chart */
                    let chartConfig = this.settings.coreParameters,
                        hasTitle: boolean = (chartConfig.showTitle && chartConfig.titleText !== null && chartConfig.titleText !== '');

                    /** Title and axes */
                        if (hasTitle) {
                            viewModel.spec.title = this.settings.coreParameters.titleText;
                        }
                        if (isCartesian) {
                            viewModel.spec.xLabel = chartConfig.xLabel
                                ?   chartConfig.xLabel
                                :   category
                                    ?   category.displayName
                                    :   '';
                            viewModel.spec.yLabel = chartConfig.yLabel
                                ?   chartConfig.yLabel
                                    :   measures && measureCount >= 1
                                        ?   measures[0].displayName
                                        :   '';
                        }

                    /** Map options */

                        /** Resolve as generically as possible to avoid repeating logic i nthe `switch` below */
                            debug.log('Resolving options...');
                            let xTickCount = this.settings.chartOptions.xTickCount === 0
                                    ?   0
                                    :       this.settings.chartOptions.xTickCount
                                        ||  VisualSettings.getDefault()['chartOptions'].xTickCount,
                                yTickCount = this.settings.chartOptions.yTickCount === 0
                                    ?   0
                                    :       this.settings.chartOptions.yTickCount
                                        || VisualSettings.getDefault()['chartOptions'].yTickCount,
                                legendPosition = this.settings.chartOptions.legendPosition || 1,
                                showLine = this.settings.chartOptions.showLine,
                                timeFormat = this.settings.chartOptions.timeFormat,
                                dotSize = this.settings.chartOptions.dotSize || VisualSettings.getDefault()['chartOptions'].dotSize,
                                innerRadius = (
                                        this.settings.chartOptions.innerPadding === 0
                                            ?   0
                                            :       this.settings.chartOptions.innerPadding
                                                ||  VisualSettings.getDefault()['chartOptions'].innerPadding
                                    ) / 100;

                        /** Add in options as needed */
                            debug.log('Mapping options...');
                            switch (chartConfig.chartType) {
                                case 'Bar': {
                                    viewModel.spec.options = {
                                        yTickCount: yTickCount
                                    };
                                    break;
                                }
                                case 'Pie': {
                                    viewModel.spec.options = {
                                        legendPosition: legendPosition,
                                        innerRadius: innerRadius
                                    };
                                    break;
                                }
                                case 'Line': {
                                    viewModel.spec.options = {
                                        yTickCount: yTickCount,
                                        legendPosition: legendPosition
                                    };
                                    break;
                                }
                                case 'XY': {
                                    viewModel.spec.options = {
                                        xTickCount: xTickCount,
                                        yTickCount: yTickCount,
                                        legendPosition: legendPosition,
                                        showLine: showLine,
                                        dotSize: dotSize
                                    };
                                    if (category.type.dateTime) {
                                        viewModel.spec.options.timeFormat = timeFormat;
                                    }
                                    break;
                                }
                            }

                    /** Map data from `dataView` */
                        debug.log('Mapping data...');
                        let catLabels = chartConfig.chartType !== 'XY'
                            ?   matrix.rows.root.children.map((c) => c.value.toString())
                            :   [];
                        switch (chartConfig.chartType) {
                            case 'Bar':
                            case 'Pie': {
                                debug.log(`${chartConfig.chartType}: mapping by category/measure`);
                                viewModel.spec.data = {
                                    labels: catLabels,
                                    datasets: [
                                        {
                                            data: matrix.rows.root.children.map((c) => {
                                                return <number>c.values[0].value;
                                            })
                                        }
                                    ]
                                };
                                break;
                            }
                            case 'Line': {
                                debug.log(`Line chart: mapping by ${series ? 'series' : 'measure'}...`);
                                viewModel.spec.data = {
                                    labels: catLabels,
                                    datasets: series
                                        ?   matrix.columns.root.children.map((c, ci) =>
                                                ({
                                                    label: c.value.toString(),
                                                    data: matrix.rows.root.children.map((r) =>
                                                            <number>r.values[ci].value
                                                        ).filter((d) => d !== null)
                                                })
                                            )
                                        :   measures.map((m, mi) => ({
                                                    label: m.displayName,
                                                    data: matrix.rows.root.children.map((r) =>
                                                        <number>r.values[mi].value
                                                    ).filter((d) => d !== null)
                                                })
                                            )
                                };
                                break;
                            }
                            case 'XY': {
                                debug.log(`XY chart: mapping by category/measure/series...`);
                                switch (xyMappingType) {
                                    case EXYChartMappingType.CatMeasureSeries: {
                                        debug.log('Mapping by series...');
                                        viewModel.spec.data = {
                                            datasets: matrix.columns.root.children.map((c, ci) =>
                                                ({
                                                    label: c.value.toString(),
                                                    data: <IXkcdChartDataSetXY[]>matrix.rows.root.children.map((r) => ({
                                                                x: <number>r.value,
                                                                y: <number>r.values[ci].value
                                                            })
                                                        ).filter((d) => d.y !== null)
                                                })
                                            )
                                        };
                                        break;
                                    }
                                    case EXYChartMappingType.CatMeasures: {
                                        debug.log('Mapping by measures...');
                                        viewModel.spec.data = {
                                            datasets: measures.map((m, mi) =>
                                                ({
                                                    label: m.displayName,
                                                    data: <IXkcdChartDataSetXY[]>matrix.rows.root.children.map((r) => ({
                                                                x: <number>r.value,
                                                                y: <number>r.values[mi].value
                                                            })
                                                        ).filter((d) => d.y !== null)
                                                })
                                            )
                                        };
                                        break;
                                    }
                                    case EXYChartMappingType.CatMeasureCat: {
                                        debug.log('Mapping by category and categorical measure...');
                                        /** TODO: This situation has cartesian product of category x measure in matrix.rows.root.children[].levelValues[] and will need to be grouped/managed */
                                        break;
                                    }
                                }
                                break;
                            }
                        }

                viewModel.testResult.result = true;
                return viewModel;
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

                /** Initial debugging for properties update */
                    let debug = new VisualDebugger(this.settings.about.debugMode && this.settings.about.debugProperties);
                    debug.heading(`Properties: ${objectName}`);

                /** Apply instance-specific transformations */
                    switch (objectName) {

                        case 'about' : {
                            /** Version should always show the default */
                                instances[0].properties['version'] = VisualSettings.getDefault()['about'].version;
                                instances[0].properties['chartXkcdVersion'] = VisualSettings.getDefault()['about'].chartXkcdVersion;

                            /** Switch off and hide debug mode if development flag is disabled */
                                if (!this.settings.about.development) {
                                    delete instances[0].properties['debugMode'];
                                    delete instances[0].properties['debugVisualUpdate'];
                                    delete instances[0].properties['debugProperties'];
                                }

                            /** Reset the individual flags if debug mode switched off */
                                if (!this.settings.about.debugMode) {
                                    this.settings.about.debugVisualUpdate = false;
                                    this.settings.about.debugProperties = false;
                                    delete instances[0].properties['debugVisualUpdate'];
                                    delete instances[0].properties['debugTooltipEvents'];
                                    delete instances[0].properties['debugProperties'];
                                }
                                break;
                        }

                        case 'coreParameters': {
                            /** Only show title text if we've opted to enable it */
                                if (!this.settings.coreParameters.showTitle) {
                                    delete instances[0].properties['titleText'];
                                }

                            /** Hide x/y labels if non-cartesian chart */
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
                                        min: 0,
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