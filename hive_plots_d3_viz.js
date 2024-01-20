"use strict";

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

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

    var axisNames = Object.keys(data.axes);
    for (let i = 0; i < axisNames.length; i++){
        var start = data.axes[axisNames[i]].start;
        var end = data.axes[axisNames[i]].end;
        /* TODO: call scalings more DRY */
        var scaledStart = [x(start[0]), y(start[1])];
        var scaledEnd = [x(end[0]), y(end[1])];

        var myLine = d3.line()([scaledStart, scaledEnd]);

        console.log("plotting line");
        console.log(myLine);

        svg.append("path")
            .datum(data)
            .attr("d", myLine)
            .attr("stroke", "black")
            .attr("stroke-width", 1.5)
            .attr("class", "axis");
    }
}

export function plotNodes(data, svg, x, y) {
    /**
     * Plot the nodes from a python hiveplotlib JSON output.
     * @param {Object} data python hiveplotlib JSON output
     * read in with d3.json().
     * @param {} svg SVG object onto which to plot nodes.
     * @param {d3.scaleLinear} x d3 x axis.
     * @param {d3.scaleLinear} y d3 y axis.
     * @return {null} Nothing returned as changes will be made
     * directly to the svg input.
     */

    console.log("plotting nodes");

    var axisNames = Object.keys(data.axes);
    for (let i = 0; i < axisNames.length; i++){
        // this at least plots one real point from each axis...
        var NodeX = data.axes[axisNames[i]].nodes.x;
        var NodeY = data.axes[axisNames[i]].nodes.y;
        svg.selectAll("circle.datapoint")
            .data(d3.zip(NodeX, NodeY))
            .enter()
            .append("circle")
            .attr("cx", d => x(d[0]))
            .attr("cy", d => y(d[1]))
            .attr("r", 3)
            .attr("class", "node");
    }
}

export function plotEdges(data, svg, x, y) {
    /**
     * Plot the edges from a python hiveplotlib JSON output.
     * @param {Object} data python hiveplotlib JSON output
     * read in with d3.json().
     * @param {} svg SVG object onto which to plot nodes.
     * @param {d3.scaleLinear} x d3 x axis.
     * @param {d3.scaleLinear} y d3 y axis.
     * @return {null} Nothing returned as changes will be made
     * directly to the svg input.
     * @todo: pass along other edge kwargs to each edge
     */

    var axisNames = Object.keys(data.edges);
    for (var i = 0; i < axisNames.length; i++){
        var connectingAxes = Object.keys(data.edges[axisNames[i]]);
        for (var j = 0; j < connectingAxes.length; j++){
            var tags = Object.keys(data.edges[axisNames[i]][connectingAxes[j]]);
            for (var k = 0; k < tags.length; k++){
                var edgeInfo = data.edges[axisNames[i]][connectingAxes[j]][tags[k]]
                var numEdges = edgeInfo.ids.length;
                // grab and plot each edge by selecting subset of curves array
                for (var curveIdx = 0; curveIdx < numEdges; curveIdx++){
                    var curveData = edgeInfo.curves[curveIdx];
                    var curveLine = d3.line()
                        .x(d => x(d[0]))
                        .y(d => y(d[1]))
                    svg.append("path")
                        .datum(curveData)
                        .attr("d", d => curveLine(d))
                        .attr("points", curveData)
                        .attr("stroke", edgeInfo.edge_kwargs.color)
                        .attr("fill", "none")
                        .attr("stroke-width", 1.5)
                    }
                break;
            }
        }
    }
}

export default function visualizeHivePlot(
    hiveplotlibOutputFile, xExtent = [-5, 5], yExtent = [-5, 5], top = 0,
    bottom = 0, left = 0, right = 0, width = 450, height = 450, element = "body"
    ) {
    /**
     * Visualize hive plot from JSON output generated from python Hiveplotlib.
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
     * @return {} the resulting SVG object with a d3 hive plot.
     */
    var svgInputs = initializeSVG(
        xExtent, yExtent, top, bottom,
        left, right, width, height, element
    );
    
    d3.json(hiveplotlibOutputFile).then(function(data) {
        plotEdges(
            data,
            svgInputs["svgInfo"].svg(),
            svgInputs["x"],
            svgInputs["y"],
        );
        plotAxes(
            data,
            svgInputs["svgInfo"].svg(),
            svgInputs["x"],
            svgInputs["y"],
        );
        plotNodes(
            data,
            svgInputs["svgInfo"].svg(),
            svgInputs["x"],
            svgInputs["y"],
        );
    })

    return svgInputs["svgInfo"].svg();
}
