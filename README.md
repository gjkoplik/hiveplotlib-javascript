# hiveplotlib-javascript

JavaScript visualization for JSON outputs from [Hiveplotlib](https://gitlab.com/geomdata/hiveplotlib).

## Goal of This Repository

This repository is intended to reduce the barriers to entry for people to use hive plots for their network visualization
and analysis. Specifically, if you are a back-end developer hoping to use Hiveplotlib on a project,
then you can point a front-end team to this resource to accelerate the integration.

## Features

- `<hive-plot>` Web Component — works in React, Vue, Svelte, plain HTML, or any framework.
- Frontend teams can override all visual properties of a Hiveplotlib JSON output (colors, line widths, opacity, etc.)
  via CSS without touching the backend JSON.
- Semantic `data-*` attributes on every SVG element for targeted CSS styling.
- Renders `hiveplotlib.HivePlot` JSON exports using D3.js under the hood.
- Supports all `hiveplotlib` visual keyword arguments as defaults: edge color/alpha/linewidth/linestyle,
  node color/size/alpha/edgecolor, and colormaps.
- Accepts both file URLs and in-memory JavaScript objects.

## Installation

### npm

```bash
npm install @hiveplotlib/d3
```

### CDN

No installation needed — include the web component directly in a browser:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@hiveplotlib/d3/hive_plot_element.min.js"
></script>
```

For local development, testing, and building see [CONTRIBUTING.md](CONTRIBUTING.md).

## Usage

The `<hive-plot>` Web Component is the recommended way to use this library. Point it at
a hiveplotlib JSON file and it renders an SVG hive plot:

```html
<hive-plot src="data.json"></hive-plot>
```

### Attributes and properties

| Name          | Type      | Default | Description                                       |
| ------------- | --------- | ------- | ------------------------------------------------- |
| `src`         | attribute | —       | URL to a hiveplotlib JSON file                    |
| `.data`       | property  | —       | In-memory JS object (takes precedence over `src`) |
| `width`       | attribute | `550`   | SVG width in pixels                               |
| `height`      | attribute | `550`   | SVG height in pixels                              |
| `show-labels` | attribute | `true`  | Show axis labels (`"true"`/`"false"`)             |

```javascript
// Set data from a URL via attribute
const el = document.querySelector("hive-plot");
el.setAttribute("src", "data.json");

// Or set an in-memory object via property
el.data = myHivePlotJSON;
```

### CSS styling

The JSON's visual kwargs (colors, line widths, etc.) are applied as SVG presentational
attributes, which CSS rules naturally override. Every SVG element includes semantic
`data-*` attributes for targeted styling:

```css
/* All edges */
.edge {
  stroke-width: 2;
}

/* Edges by source/target/tag */
.edge[data-source-axis="A"][data-target-axis="B"] {
  stroke: gold;
}
.edge[data-tag="inhibitory"] {
  stroke: red;
  opacity: 0.3;
}

/* Nodes by axis */
.node[data-axis="A"] {
  fill: steelblue;
}

/* Hover effects */
.node:hover {
  fill: orange;
}
```

Available data attributes:

| Element       | Attributes                                                             |
| ------------- | ---------------------------------------------------------------------- |
| `.axis`       | `data-axis`, `data-long-name`                                          |
| `.node`       | `data-axis`, `data-node-id`                                            |
| `.edge`       | `data-source-axis`, `data-target-axis`, `data-tag`, `data-edge-number` |
| `.axis-label` | `data-axis`                                                            |

More detailed descriptions of each attribute and how to use them to alter the hive plot visualization can be found in
the docstring for `HivePlotElement` in `hive_plot_element.js`.

### Framework examples

```jsx
// React
import "@hiveplotlib/d3/element";
function App() {
  return <hive-plot src="/api/hive_plot.json" />;
}
```

```html
<!-- Vue -->
<script setup>
  import "@hiveplotlib/d3/element";
</script>
<template>
  <hive-plot src="/api/hive_plot.json"></hive-plot>
</template>
```

## Direct D3 API

If you need full control over the rendering pipeline (custom margins, scales, etc.),
you can use the D3 API directly instead of the web component:

```javascript
// npm
import visualizeHivePlot from "@hiveplotlib/d3";

// CDN
import visualizeHivePlot from "https://cdn.jsdelivr.net/npm/@hiveplotlib/d3/hive_plots_d3_viz.min.js";

// from a URL (async — awaits data loading before rendering)
await visualizeHivePlot(
  "example_hive_plot.json",
  [-6, 6],
  [-6, 6],
  20,
  0,
  0,
  0,
  550,
  550,
  "my-container",
);

// from an in-memory object
await visualizeHivePlot(
  data,
  [-6, 6],
  [-6, 6],
  20,
  0,
  0,
  0,
  550,
  550,
  "my-container",
  {
    showLabels: true,
    labelsBuffer: 1.1,
    fontSize: 14,
  },
);
```

See the [Hiveplotlib documentation](https://hiveplotlib.readthedocs.io/) for an introduction to Hive Plots,
and for more on the JSON structure generated, see
[here](https://hiveplotlib.readthedocs.io/stable/notebooks/hive_plot_viz_outside_matplotlib.html#Exporting-Hive-Plots-as-JSON).

## A Note on JSON Fixtures

`example_hive_plot.json` and the files under `tests/fixtures/` are generated by `hiveplotlib` static methods
(`example_hive_plot`, `example_minimal_hive_plot`, `example_multi_tag_hive_plot`, `example_full_kwargs_hive_plot`)
and tested through Continuous Integration to ensure the JSON data stays in sync.

Should the JSON output ever be changed in Hiveplotlib, it will be changed here as well.
