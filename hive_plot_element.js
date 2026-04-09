"use strict";

import visualizeHivePlot from "./hive_plots_d3_viz.js";

/**
 * <hive-plot> Web Component for rendering hive plots from hiveplotlib JSON.
 *
 * Attributes:
 *   - src: URL or file path to a hiveplotlib JSON file.
 *   - width: Width of the SVG in pixels (default 550).
 *   - height: Height of the SVG in pixels (default 550).
 *   - show-labels: Whether to show axis labels (default "true").
 *
 * Properties:
 *   - data: Set a parsed JSON object directly (takes precedence over src).
 *
 * Events:
 *   - hive-plot-rendered: Fired after the SVG is rendered.
 *   - hive-plot-error: Fired if fetching the src URL fails.
 *
 * No Shadow DOM is used, so external CSS can target SVG elements directly.
 * JSON kwargs are applied as SVG presentational attributes, which CSS rules
 * naturally override without !important.
 *
 * Data attributes on rendered SVG elements (for CSS targeting):
 *   - .axis (path):       data-axis, data-long-name
 *   - .node (circle):     data-axis, data-node-id
 *   - .edge (path):       data-source-axis, data-target-axis, data-tag,
 *                          data-edge-number
 *   - .axis-label (text):  data-axis
 *
 * Attribute descriptions:
 *   - data-axis: The key name identifying the axis in the hiveplotlib JSON
 *     (e.g. "A", "B"). Present on axes, nodes, and labels. For nodes, this
 *     indicates which axis the node is plotted on. Use this to target all
 *     elements belonging to a specific axis (e.g. style all nodes on axis
 *     "A" differently from those on axis "B").
 *   - data-long-name: The display label for the axis, taken from the
 *     long_name field in the JSON. Falls back to the axis key if long_name
 *     is not set. Use this to target axes by their human-readable label
 *     when the axis key is an internal identifier.
 *   - data-node-id: The unique identifier of the node, matching the
 *     unique_id value from the JSON. Use this to target a specific node
 *     (e.g. for highlighting a node by its ID from the original network).
 *   - data-source-axis: The axis that the edge originates from. This is
 *     the axis name, not a node ID. Use this to target all edges leaving
 *     a specific axis.
 *   - data-target-axis: The axis that the edge connects to. This is
 *     the axis name, not a node ID. Use this to target all edges arriving
 *     at a specific axis.
 *   - data-tag: The edge group/tag label from the hiveplotlib JSON.
 *     Tags distinguish different categories of edges between the same
 *     pair of axes (e.g. "excitatory" vs "inhibitory" connections). Use
 *     this to target a category of edges for distinct styling.
 *   - data-edge-number: The zero-based index of this specific edge within
 *     its (source-axis, target-axis, tag) group. Use this to target an
 *     individual edge path — for example, to highlight a single connection
 *     out of many between two axes.
 *
 * @example
 * <hive-plot src="data.json" width="800" height="600"></hive-plot>
 *
 * <style>
 *   .edge[data-tag="strong"] { stroke: steelblue; stroke-width: 3; }
 *   .node[data-axis="A"] { fill: red; }
 * </style>
 */
class HivePlotElement extends HTMLElement {
  static get observedAttributes() {
    return ["src", "width", "height", "show-labels"];
  }

  constructor() {
    super();
    this._data = null;
    this._rendering = false;
    this._pendingRender = false;
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    /* c8 ignore next -- browsers never fire this with oldValue === newValue */
    if (oldValue !== newValue) {
      if (name === "src") {
        this._data = null;
      }
      this._render();
    }
  }

  get data() {
    return this._data;
  }

  set data(value) {
    this._data = value;
    this.removeAttribute("src");
    this._render();
  }

  async _render() {
    if (this._rendering) {
      this._pendingRender = true;
      return;
    }
    this._rendering = true;

    try {
      this.innerHTML = "";

      let data = this._data;
      if (!data && this.hasAttribute("src")) {
        try {
          const response = await fetch(this.getAttribute("src"));
          data = await response.json();
          this._data = data;
        } catch (err) {
          this.dispatchEvent(
            new CustomEvent("hive-plot-error", {
              bubbles: true,
              detail: { error: err },
            }),
          );
          return;
        }
      }

      if (!data || !this.isConnected) return;

      const width = parseInt(this.getAttribute("width") || "550", 10);
      const height = parseInt(this.getAttribute("height") || "550", 10);
      const showLabels = this.getAttribute("show-labels") !== "false";

      await visualizeHivePlot(
        data,
        [-6, 6],
        [-6, 6],
        20,
        0,
        0,
        0,
        width,
        height,
        this,
        { showLabels },
      );

      this.dispatchEvent(
        new CustomEvent("hive-plot-rendered", {
          bubbles: true,
          detail: { data },
        }),
      );
    } finally {
      this._rendering = false;
      if (this._pendingRender) {
        this._pendingRender = false;
        this._render();
      }
    }
  }
}

customElements.define("hive-plot", HivePlotElement);

export default HivePlotElement;
