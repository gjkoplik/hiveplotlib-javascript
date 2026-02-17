"use strict";

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";


// ---------------------------------------------------------------------------
// Kwarg mapping utilities (matplotlib -> SVG/D3)
// ---------------------------------------------------------------------------

/**
 * Normalize matplotlib edge kwarg aliases to canonical names.
 * @param {Object} kwargs - edge kwargs from JSON.
 * @return {Object} normalized kwargs.
 */
export function normalizeEdgeKwargs(kwargs) {
    const normalized = { ...kwargs };
    if ("lw" in normalized && !("linewidth" in normalized)) {
        normalized.linewidth = normalized.lw;
        delete normalized.lw;
    }
    if ("ls" in normalized && !("linestyle" in normalized)) {
        normalized.linestyle = normalized.ls;
        delete normalized.ls;
    }
    return normalized;
}

/**
 * Normalize matplotlib node kwarg aliases to canonical names.
 * Priority for fill color: facecolor > color > c.
 * @param {Object} kwargs - node viz kwargs from JSON.
 * @return {Object} normalized kwargs with `_fill` for resolved fill color.
 */
export function normalizeNodeKwargs(kwargs) {
    const normalized = { ...kwargs };
    // Color aliases: priority is facecolor > color > c
    if ("facecolor" in normalized) {
        normalized._fill = normalized.facecolor;
        delete normalized.facecolor;
    } else if ("color" in normalized) {
        normalized._fill = normalized.color;
        delete normalized.color;
    } else if ("c" in normalized) {
        normalized._fill = normalized.c;
        delete normalized.c;
    }
    // Size aliases
    if ("size" in normalized && !("s" in normalized)) {
        normalized.s = normalized.size;
        delete normalized.size;
    }
    // Edgecolor aliases
    if ("edgecolors" in normalized && !("edgecolor" in normalized)) {
        normalized.edgecolor = normalized.edgecolors;
        delete normalized.edgecolors;
    }
    return normalized;
}

/**
 * Map matplotlib linestyle string to SVG stroke-dasharray value.
 * @param {string} ls - matplotlib linestyle.
 * @return {string|null} SVG stroke-dasharray value, or null for solid lines.
 */
export function linestyleToDasharray(ls) {
    const map = {
        "-": null,
        "solid": null,
        "--": "5,5",
        "dashed": "5,5",
        ":": "2,2",
        "dotted": "2,2",
        "-.": "5,2,2,2",
        "dashdot": "5,2,2,2",
    };
    return map[ls] ?? null;
}

/**
 * Map a matplotlib colormap name to a d3 interpolator function.
 * @param {string} cmapName - matplotlib colormap name (e.g. "viridis").
 * @return {Function} d3 interpolator function.
 */
export function cmapToD3Interpolator(cmapName) {
    const map = {
        "viridis": d3.interpolateViridis,
        "plasma": d3.interpolatePlasma,
        "inferno": d3.interpolateInferno,
        "magma": d3.interpolateMagma,
        "cividis": d3.interpolateCividis,
        "warm": d3.interpolateWarm,
        "cool": d3.interpolateCool,
        "turbo": d3.interpolateTurbo,
        "Blues": d3.interpolateBlues,
        "Greens": d3.interpolateGreens,
        "Greys": d3.interpolateGreys,
        "Oranges": d3.interpolateOranges,
        "Purples": d3.interpolatePurples,
        "Reds": d3.interpolateReds,
        "BuGn": d3.interpolateBuGn,
        "BuPu": d3.interpolateBuPu,
        "GnBu": d3.interpolateGnBu,
        "OrRd": d3.interpolateOrRd,
        "PuBu": d3.interpolatePuBu,
        "PuBuGn": d3.interpolatePuBuGn,
        "PuRd": d3.interpolatePuRd,
        "RdPu": d3.interpolateRdPu,
        "YlGn": d3.interpolateYlGn,
        "YlGnBu": d3.interpolateYlGnBu,
        "YlOrBr": d3.interpolateYlOrBr,
        "YlOrRd": d3.interpolateYlOrRd,
        "BrBG": d3.interpolateBrBG,
        "PRGn": d3.interpolatePRGn,
        "PiYG": d3.interpolatePiYG,
        "PuOr": d3.interpolatePuOr,
        "RdBu": d3.interpolateRdBu,
        "RdGy": d3.interpolateRdGy,
        "RdYlBu": d3.interpolateRdYlBu,
        "RdYlGn": d3.interpolateRdYlGn,
        "Spectral": d3.interpolateSpectral,
        "coolwarm": d3.interpolateRdBu,
        "rainbow": d3.interpolateRainbow,
    };
    return map[cmapName] ?? d3.interpolateViridis;
}

/**
 * Convert matplotlib scatter size (area in points^2) to SVG circle radius (pixels).
 * @param {number} s - matplotlib scatter size parameter.
 * @return {number} SVG circle radius in pixels.
 */
export function scatterSizeToRadius(s) {
    return Math.sqrt(s / Math.PI);
}


// ---------------------------------------------------------------------------
// SVG setup (marcon + initializeSVG)
// ---------------------------------------------------------------------------

export function marcon(top = 0, bottom = 0, left = 0, right = 0, width = 900, height = 600, element = "body") {
    /* Adapted from https://unpkg.com/d3-marcon@2.0.2/build/d3-marcon.js (didn't export the needed way)*/

    var instance = {};
    var svg;

    instance.top = function(d) {
      if (!arguments.length) return top;
      top = d;
      return instance;
    };

    instance.left = function(d) {
      if (!arguments.length) return left;
      left = d;
      return instance;
    };

    instance.right = function(d) {
      if (!arguments.length) return right;
      right = d;
      return instance;
    };

    instance.bottom = function(d) {
      if (!arguments.length) return bottom;
      bottom = d;
      return instance;
    };

    instance.width = function(d) {
      if (!arguments.length) return width;
      width = d;
      return instance;
    };

    instance.height = function(d) {
      if (!arguments.length) return height;
      height = d;
      return instance;
    };

    instance.element = function(d) {
      if (!arguments.length) return element;
      element = d;
      return instance;
    };

    instance.innerWidth = function() {
      return instance.width() - instance.left() - instance.right();
    };

    instance.innerHeight = function() {
      return instance.height() - instance.top() - instance.bottom();
    };

    instance.svg = function() {
      return svg;
    };

    instance.render = function() {
      svg = d3.select(element).append("svg")
          .attr("width", instance.innerWidth() + instance.left() + instance.right())
          .attr("height", instance.innerHeight() + instance.top() + instance.bottom())
        .append("g")
          .attr("transform", "translate(" + left + ", " + top + ")");
    }

    return instance;

  };


export function initializeSVG(
    xExtent = [-5, 5], yExtent = [-5, 5], top = 0, bottom = 0, left = 0, right = 0,
    width = 450, height = 450, element = "body"
    ){
    /**
     * Initialize things needed for a hive plot visualization.
     * @param  {Array} xExtent The [min, max] extent x will span in final
     * figure. Default [-5, 5].
     * @param  {Array} yExtent The [min, max] extent y will span in final
     * figure. Default [-5, 5].
     * @param  {Number} top The top margin. Default 0.
     * @param  {Number} bottom The bottom margin. Default 0.
     * @param  {Number} left The left margin. Default 0.
     * @param  {Number} right The right margin. Default 0.
     * @param  {Number} width The width of the resulting figure
     * (in pixels). Default 450.
     * @param  {Number} height The height of the resulting figure
     * (in pixels). Default 450.
     * @param  {String} element The element into which the resulting
     * SVG element will be added. Default "body".
     * @return {Object} the "svgInfo" as a d3-marcon instance,
     * the "xExtent" information, the "yExtent" information,
     * and the resulting "x" and "y" d3 axis scalings.
     */

    var m = marcon()
        .top(top)
        .bottom(bottom)
        .left(left)
        .right(right)
        .width(width)
        .height(height)
        .element(element);

    m.render();

    const yScale = d3.scaleLinear()
        .range([height - bottom, top])
        .domain(yExtent);
    const xScale = d3.scaleLinear()
        .range([left, width - right])
        .domain(xExtent);

    return {"svgInfo": m,
            "xExtent": xExtent, "yExtent": yExtent,
            "x": xScale, "y": yScale};
}


// ---------------------------------------------------------------------------
// Plotting functions
// ---------------------------------------------------------------------------

export function plotAxes(data, svg, x, y) {
    /**
     * Plot the axes from a python hiveplotlib JSON output.
     * @param {Object} data python hiveplotlib JSON output
     * read in with d3.json().
     * @param {} svg SVG object onto which to plot axes.
     * @param {d3.scaleLinear} x d3 x axis.
     * @param {d3.scaleLinear} y d3 y axis.
     * @return {null} Nothing returned as changes will be made
     * directly to the svg input.
     */

    const axisNames = Object.keys(data.axes);
    for (let i = 0; i < axisNames.length; i++){
        const axisData = data.axes[axisNames[i]];
        const start = axisData.start;
        const end = axisData.end;
        const scaledStart = [x(start[0]), y(start[1])];
        const scaledEnd = [x(end[0]), y(end[1])];

        const myLine = d3.line()([scaledStart, scaledEnd]);

        svg.append("path")
            .attr("d", myLine)
            .attr("stroke", "black")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.5)
            .attr("class", "axis");
    }
}

export function plotNodes(data, svg, x, y) {
    /**
     * Plot the nodes from a python hiveplotlib JSON output.
     * Reads node_viz_kwargs from data when available.
     * @param {Object} data python hiveplotlib JSON output
     * read in with d3.json().
     * @param {} svg SVG object onto which to plot nodes.
     * @param {d3.scaleLinear} x d3 x axis.
     * @param {d3.scaleLinear} y d3 y axis.
     * @return {null} Nothing returned as changes will be made
     * directly to the svg input.
     */

    const axisNames = Object.keys(data.axes);
    for (let i = 0; i < axisNames.length; i++){
        const axisName = axisNames[i];
        const nodeX = data.axes[axisName].nodes.x;
        const nodeY = data.axes[axisName].nodes.y;

        // Resolve node_viz_kwargs for this axis
        let kwargs = {};
        if (data.node_viz_kwargs && data.node_viz_kwargs[axisName]) {
            kwargs = normalizeNodeKwargs(data.node_viz_kwargs[axisName]);
        }

        // Set up colormap if _fill is a numeric array
        let colorScale = null;
        if (Array.isArray(kwargs._fill) && kwargs._fill.length > 0 && typeof kwargs._fill[0] === "number") {
            const interpolator = cmapToD3Interpolator(kwargs.cmap);
            const domain = [
                kwargs.vmin ?? d3.min(kwargs._fill),
                kwargs.vmax ?? d3.max(kwargs._fill),
            ];
            colorScale = d3.scaleSequential(interpolator).domain(domain);
        }

        const nodeData = d3.zip(nodeX, nodeY);

        // Use selectAll(null) to avoid data join conflicts across axes
        svg.selectAll(null)
            .data(nodeData)
            .enter()
            .append("circle")
            .attr("cx", d => x(d[0]))
            .attr("cy", d => y(d[1]))
            .attr("r", (d, j) => {
                const s = Array.isArray(kwargs.s) ? kwargs.s[j] : (kwargs.s ?? 20);
                return scatterSizeToRadius(s);
            })
            .attr("fill", (d, j) => {
                if (colorScale) return colorScale(kwargs._fill[j]);
                if (Array.isArray(kwargs._fill)) return kwargs._fill[j];
                return kwargs._fill || "black";
            })
            .attr("fill-opacity", (d, j) => {
                return Array.isArray(kwargs.alpha) ? kwargs.alpha[j] : (kwargs.alpha ?? 0.8);
            })
            .attr("stroke", (d, j) => {
                if (!kwargs.edgecolor) return "none";
                return Array.isArray(kwargs.edgecolor) ? kwargs.edgecolor[j] : kwargs.edgecolor;
            })
            .attr("class", "node");
    }
}

export function plotEdges(data, svg, x, y) {
    /**
     * Plot the edges from a python hiveplotlib JSON output.
     * Reads all edge_kwargs (color, alpha, linewidth, linestyle, cmap).
     * @param {Object} data python hiveplotlib JSON output
     * read in with d3.json().
     * @param {} svg SVG object onto which to plot edges.
     * @param {d3.scaleLinear} x d3 x axis.
     * @param {d3.scaleLinear} y d3 y axis.
     * @return {null} Nothing returned as changes will be made
     * directly to the svg input.
     */

    if (!data.edges) return;

    const fromAxes = Object.keys(data.edges);
    for (let i = 0; i < fromAxes.length; i++){
        const toAxes = Object.keys(data.edges[fromAxes[i]]);
        for (let j = 0; j < toAxes.length; j++){
            const tags = Object.keys(data.edges[fromAxes[i]][toAxes[j]]);
            for (let k = 0; k < tags.length; k++){
                const edgeInfo = data.edges[fromAxes[i]][toAxes[j]][tags[k]];
                // skip entries without actual edge data (e.g. only edge_kwargs)
                if (!edgeInfo.ids || edgeInfo.ids.length === 0) continue;
                const numEdges = edgeInfo.ids.length;
                const kwargs = normalizeEdgeKwargs(edgeInfo.edge_kwargs || {});

                // Set up colormap scale if 'array' is present
                let colorScale = null;
                if (kwargs.array) {
                    const interpolator = cmapToD3Interpolator(kwargs.cmap);
                    const domain = kwargs.clim || d3.extent(kwargs.array);
                    colorScale = d3.scaleSequential(interpolator).domain(domain);
                }

                for (let curveIdx = 0; curveIdx < numEdges; curveIdx++){
                    const curveData = edgeInfo.curves[curveIdx];
                    const curveLine = d3.line()
                        .x(d => x(d[0]))
                        .y(d => y(d[1]));

                    const path = svg.append("path")
                        .datum(curveData)
                        .attr("d", d => curveLine(d))
                        .attr("fill", "none")
                        .attr("class", "edge");

                    // Color: array+cmap takes priority, then per-edge color array, then scalar
                    if (colorScale && kwargs.array) {
                        path.attr("stroke", colorScale(kwargs.array[curveIdx]));
                    } else if (Array.isArray(kwargs.color)) {
                        path.attr("stroke", kwargs.color[curveIdx]);
                    } else {
                        path.attr("stroke", kwargs.color || "black");
                    }

                    // Alpha
                    const alpha = Array.isArray(kwargs.alpha)
                        ? kwargs.alpha[curveIdx] : (kwargs.alpha ?? 0.5);
                    path.attr("stroke-opacity", alpha);

                    // Linewidth
                    const lw = Array.isArray(kwargs.linewidth)
                        ? kwargs.linewidth[curveIdx] : (kwargs.linewidth ?? 1.5);
                    path.attr("stroke-width", lw);

                    // Linestyle
                    if (kwargs.linestyle) {
                        const dash = linestyleToDasharray(
                            Array.isArray(kwargs.linestyle) ? kwargs.linestyle[curveIdx] : kwargs.linestyle
                        );
                        if (dash) path.attr("stroke-dasharray", dash);
                    }
                }
            }
        }
    }
}

export function plotLabels(data, svg, x, y, options = {}) {
    /**
     * Plot axis labels from a python hiveplotlib JSON output.
     * Uses long_name and angle from each axis to position and align labels.
     * @param {Object} data python hiveplotlib JSON output.
     * @param {} svg SVG object onto which to plot labels.
     * @param {d3.scaleLinear} x d3 x axis.
     * @param {d3.scaleLinear} y d3 y axis.
     * @param {Object} options label rendering options.
     * @param {number} options.labelsBuffer radial buffer multiplier for label
     * placement. Default 1.1.
     * @param {number} options.fontSize font size in pixels. Default 14.
     * @param {number} options.horizontalAngleSpan angle span for
     * horizontal alignment partitioning. Default 60.
     * @param {number} options.verticalAngleSpan angle span for
     * vertical alignment partitioning. Default 60.
     * @return {null} Nothing returned as changes will be made
     * directly to the svg input.
     */

    const {
        labelsBuffer = 1.1,
        fontSize = 14,
        horizontalAngleSpan = 60,
        verticalAngleSpan = 60,
    } = options;

    const axisNames = Object.keys(data.axes);
    for (let i = 0; i < axisNames.length; i++) {
        const axisData = data.axes[axisNames[i]];
        const longName = axisData.long_name || axisNames[i];
        const angle = axisData.angle;

        // Skip if angle not in JSON (backward compat with older exports)
        if (angle === undefined) continue;

        // Compute label position: extend axis endpoint radially by labelsBuffer
        const start = axisData.start;
        const end = axisData.end;
        const labelX = start[0] + labelsBuffer * (end[0] - start[0]);
        const labelY = start[1] + labelsBuffer * (end[1] - start[1]);

        // Compute text-anchor from angle (ported from Python viz/base.py get_axis_label_alignment)
        let textAnchor;
        if (angle >= 360 - horizontalAngleSpan || angle <= horizontalAngleSpan) {
            textAnchor = "start";
        } else if (angle >= 180 - horizontalAngleSpan && angle <= 180 + horizontalAngleSpan) {
            textAnchor = "end";
        } else {
            textAnchor = "middle";
        }

        // Compute dominant-baseline from angle
        let dominantBaseline;
        if (angle >= 90 - verticalAngleSpan && angle <= 90 + verticalAngleSpan) {
            dominantBaseline = "auto";
        } else if (angle >= 270 - verticalAngleSpan && angle <= 270 + verticalAngleSpan) {
            dominantBaseline = "hanging";
        } else {
            dominantBaseline = "middle";
        }

        svg.append("text")
            .attr("x", x(labelX))
            .attr("y", y(labelY))
            .attr("text-anchor", textAnchor)
            .attr("dominant-baseline", dominantBaseline)
            .attr("font-size", fontSize)
            .attr("class", "axis-label")
            .text(longName);
    }
}


// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export default function visualizeHivePlot(
    hiveplotlibOutput, xExtent = [-5, 5], yExtent = [-5, 5], top = 0,
    bottom = 0, left = 0, right = 0, width = 450, height = 450,
    element = "body", options = {}
    ) {
    /**
     * Visualize hive plot from JSON output generated from python Hiveplotlib.
     * @param  {string|Object} hiveplotlibOutput Either a file path / URL to
     * a JSON file, or an in-memory JavaScript object with the hiveplotlib
     * JSON structure.
     * @param  {Array} xExtent The [min, max] extent x will span in final
     * figure. Default [-5, 5].
     * @param  {Array} yExtent The [min, max] extent y will span in final
     * figure. Default [-5, 5].
     * @param  {Number} top The top margin. Default 0.
     * @param  {Number} bottom The bottom margin. Default 0.
     * @param  {Number} left The left margin. Default 0.
     * @param  {Number} right The right margin. Default 0.
     * @param  {Number} width The width of the resulting figure
     * (in pixels). Default 450.
     * @param  {Number} height The height of the resulting figure
     * (in pixels). Default 450.
     * @param  {String} element The element into which the resulting
     * SVG element will be added. Default "body".
     * @param  {Object} options Additional options.
     * @param  {boolean} options.showLabels Whether to show axis labels.
     * Default true.
     * @param  {number} options.labelsBuffer Radial buffer multiplier for
     * label placement. Default 1.1.
     * @param  {number} options.fontSize Font size for labels. Default 14.
     * @return {} the resulting SVG object with a d3 hive plot.
     */
    const { showLabels = true, labelsBuffer = 1.1, fontSize = 14 } = options;

    var svgInputs = initializeSVG(
        xExtent, yExtent, top, bottom,
        left, right, width, height, element
    );

    const render = (data) => {
        const svg = svgInputs["svgInfo"].svg();
        const xScale = svgInputs["x"];
        const yScale = svgInputs["y"];

        plotEdges(data, svg, xScale, yScale);
        plotAxes(data, svg, xScale, yScale);
        plotNodes(data, svg, xScale, yScale);
        if (showLabels) {
            plotLabels(data, svg, xScale, yScale, { labelsBuffer, fontSize });
        }
    };

    if (typeof hiveplotlibOutput === "string") {
        /* c8 ignore next 2 -- only untested line is d3.json(url).then(render);
           render() itself is fully tested via the in-memory object branch below */
        d3.json(hiveplotlibOutput).then(render);
    } else {
        // In-memory JS object
        render(hiveplotlibOutput);
    }

    return svgInputs["svgInfo"].svg();
}
