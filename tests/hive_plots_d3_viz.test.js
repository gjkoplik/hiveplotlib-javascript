import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  marcon,
  initializeSVG,
  plotAxes,
  plotNodes,
  plotEdges,
  plotLabels,
  normalizeEdgeKwargs,
  normalizeNodeKwargs,
  linestyleToDasharray,
  cmapToD3Interpolator,
  scatterSizeToRadius,
} from "../hive_plots_d3_viz.js";
import visualizeHivePlot from "../hive_plots_d3_viz.js";
import * as d3 from "d3";

vi.mock("https://cdn.jsdelivr.net/npm/d3@7/+esm", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual };
});

// ---------------------------------------------------------------------------
// Fixture loading helpers
// ---------------------------------------------------------------------------

function loadFixture(name) {
  const path = resolve(import.meta.dirname, "fixtures", name);
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadExampleHivePlot() {
  const path = resolve(import.meta.dirname, "..", "example_hive_plot.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

// Helper to get an initialized SVG for test rendering
function getTestSVG() {
  const result = initializeSVG([-5, 5], [-5, 5], 0, 0, 0, 0, 450, 450, "body");
  return {
    svg: result.svgInfo.svg(),
    x: result.x,
    y: result.y,
  };
}

// Count total edges in a hiveplotlib JSON structure
function countEdges(data) {
  let total = 0;
  for (const a in data.edges || {}) {
    for (const b in data.edges[a]) {
      for (const t in data.edges[a][b]) {
        total += (data.edges[a][b][t].curves || []).length;
      }
    }
  }
  return total;
}

// ===========================================================================
// Kwarg mapping utilities
// ===========================================================================

describe("normalizeEdgeKwargs", () => {
  it("should pass through kwargs without aliases unchanged", () => {
    const input = { color: "red", linewidth: 2, alpha: 0.5 };
    expect(normalizeEdgeKwargs(input)).toEqual(input);
  });

  it("should map lw to linewidth", () => {
    const result = normalizeEdgeKwargs({ lw: 3 });
    expect(result.linewidth).toBe(3);
    expect(result.lw).toBeUndefined();
  });

  it("should not override existing linewidth with lw", () => {
    const result = normalizeEdgeKwargs({ lw: 3, linewidth: 5 });
    expect(result.linewidth).toBe(5);
  });

  it("should map ls to linestyle", () => {
    const result = normalizeEdgeKwargs({ ls: "--" });
    expect(result.linestyle).toBe("--");
    expect(result.ls).toBeUndefined();
  });

  it("should not mutate the input object", () => {
    const input = { lw: 3 };
    normalizeEdgeKwargs(input);
    expect(input.lw).toBe(3);
  });
});

describe("normalizeNodeKwargs", () => {
  it("should map c to _fill", () => {
    const result = normalizeNodeKwargs({ c: "red" });
    expect(result._fill).toBe("red");
    expect(result.c).toBeUndefined();
  });

  it("should map color to _fill", () => {
    const result = normalizeNodeKwargs({ color: "blue" });
    expect(result._fill).toBe("blue");
    expect(result.color).toBeUndefined();
  });

  it("should map facecolor to _fill", () => {
    const result = normalizeNodeKwargs({ facecolor: "green" });
    expect(result._fill).toBe("green");
    expect(result.facecolor).toBeUndefined();
  });

  it("should prioritize facecolor over color over c", () => {
    expect(
      normalizeNodeKwargs({ c: "red", color: "blue", facecolor: "green" })
        ._fill,
    ).toBe("green");
    expect(normalizeNodeKwargs({ c: "red", color: "blue" })._fill).toBe("blue");
    expect(normalizeNodeKwargs({ c: "red" })._fill).toBe("red");
  });

  it("should map size to s", () => {
    const result = normalizeNodeKwargs({ size: 40 });
    expect(result.s).toBe(40);
    expect(result.size).toBeUndefined();
  });

  it("should not override existing s with size", () => {
    const result = normalizeNodeKwargs({ size: 40, s: 20 });
    expect(result.s).toBe(20);
  });

  it("should map edgecolors to edgecolor", () => {
    const result = normalizeNodeKwargs({ edgecolors: "black" });
    expect(result.edgecolor).toBe("black");
    expect(result.edgecolors).toBeUndefined();
  });

  it("should not mutate the input object", () => {
    const input = { c: "red" };
    normalizeNodeKwargs(input);
    expect(input.c).toBe("red");
  });

  it("should remove lower-priority color keys when higher priority wins", () => {
    const result = normalizeNodeKwargs({
      facecolor: "green",
      color: "blue",
      c: "red",
    });
    expect(result._fill).toBe("green");
    expect(result.color).toBeUndefined();
    expect(result.c).toBeUndefined();
    expect(result.facecolor).toBeUndefined();

    const result2 = normalizeNodeKwargs({ color: "blue", c: "red" });
    expect(result2._fill).toBe("blue");
    expect(result2.c).toBeUndefined();
    expect(result2.color).toBeUndefined();
  });
});

describe("linestyleToDasharray", () => {
  it("should return null for solid lines", () => {
    expect(linestyleToDasharray("-")).toBeNull();
    expect(linestyleToDasharray("solid")).toBeNull();
  });

  it("should return '5,5' for dashed lines", () => {
    expect(linestyleToDasharray("--")).toBe("5,5");
    expect(linestyleToDasharray("dashed")).toBe("5,5");
  });

  it("should return '2,2' for dotted lines", () => {
    expect(linestyleToDasharray(":")).toBe("2,2");
    expect(linestyleToDasharray("dotted")).toBe("2,2");
  });

  it("should return '5,2,2,2' for dashdot lines", () => {
    expect(linestyleToDasharray("-.")).toBe("5,2,2,2");
    expect(linestyleToDasharray("dashdot")).toBe("5,2,2,2");
  });

  it("should return null for unknown styles", () => {
    expect(linestyleToDasharray("unknown")).toBeNull();
  });
});

describe("cmapToD3Interpolator", () => {
  it("should return a function for known colormaps", () => {
    expect(typeof cmapToD3Interpolator("viridis")).toBe("function");
    expect(typeof cmapToD3Interpolator("plasma")).toBe("function");
    expect(typeof cmapToD3Interpolator("magma")).toBe("function");
    expect(typeof cmapToD3Interpolator("cividis")).toBe("function");
  });

  it("should return different interpolators for different cmaps", () => {
    expect(cmapToD3Interpolator("viridis")).not.toBe(
      cmapToD3Interpolator("plasma"),
    );
  });

  it("should default to viridis for unknown cmaps", () => {
    expect(cmapToD3Interpolator("not_a_cmap")).toBe(
      cmapToD3Interpolator("viridis"),
    );
  });

  it("should handle undefined/null by defaulting to viridis", () => {
    expect(cmapToD3Interpolator(undefined)).toBe(
      cmapToD3Interpolator("viridis"),
    );
  });
});

describe("scatterSizeToRadius", () => {
  it("should convert matplotlib scatter size to SVG radius", () => {
    // s=20 -> r = sqrt(20/PI) ~= 2.523
    const r = scatterSizeToRadius(20);
    expect(r).toBeCloseTo(Math.sqrt(20 / Math.PI), 5);
  });

  it("should return 0 for size 0", () => {
    expect(scatterSizeToRadius(0)).toBe(0);
  });

  it("should handle large sizes", () => {
    const r = scatterSizeToRadius(100);
    expect(r).toBeCloseTo(Math.sqrt(100 / Math.PI), 5);
  });
});

// ===========================================================================
// SVG setup
// ===========================================================================

describe("marcon", () => {
  it("should return correct default values", () => {
    const m = marcon();
    expect(m.width()).toBe(900);
    expect(m.height()).toBe(600);
    expect(m.top()).toBe(0);
    expect(m.bottom()).toBe(0);
    expect(m.left()).toBe(0);
    expect(m.right()).toBe(0);
  });

  it("should support setter/getter chaining", () => {
    const m = marcon()
      .top(10)
      .left(20)
      .right(30)
      .bottom(40)
      .width(500)
      .height(400);
    expect(m.top()).toBe(10);
    expect(m.left()).toBe(20);
    expect(m.right()).toBe(30);
    expect(m.bottom()).toBe(40);
    expect(m.width()).toBe(500);
    expect(m.height()).toBe(400);
    expect(m.element()).toBe("body");
  });

  it("should compute innerWidth and innerHeight correctly", () => {
    const m = marcon().width(500).left(20).right(30);
    expect(m.innerWidth()).toBe(450);
    const m2 = marcon().height(400).top(10).bottom(40);
    expect(m2.innerHeight()).toBe(350);
  });

  it("should append SVG element on render", () => {
    const m = marcon().width(100).height(100).element("body");
    m.render();
    expect(m.svg()).toBeDefined();
    // Check that the body now has an SVG element
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });
});

describe("initializeSVG", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should return object with required keys", () => {
    const result = initializeSVG();
    expect(result).toHaveProperty("svgInfo");
    expect(result).toHaveProperty("xExtent");
    expect(result).toHaveProperty("yExtent");
    expect(result).toHaveProperty("x");
    expect(result).toHaveProperty("y");
  });

  it("should create scales that map domain to range correctly", () => {
    const result = initializeSVG([-5, 5], [-5, 5], 0, 0, 0, 0, 450, 450);
    // x domain -5 -> range 0, x domain 5 -> range 450
    expect(result.x(-5)).toBe(0);
    expect(result.x(5)).toBe(450);
    // y domain -5 -> range 450 (bottom), y domain 5 -> range 0 (top) (SVG y is inverted)
    expect(result.y(-5)).toBe(450);
    expect(result.y(5)).toBe(0);
  });

  it("should respect custom extents", () => {
    const result = initializeSVG([-10, 10], [-10, 10], 0, 0, 0, 0, 200, 200);
    expect(result.x(0)).toBe(100); // midpoint
    expect(result.y(0)).toBe(100); // midpoint
  });
});

// ===========================================================================
// plotAxes
// ===========================================================================

describe("plotAxes", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should create one path.axis per axis", () => {
    const data = loadFixture("minimal_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotAxes(data, svg, x, y);

    const axisPaths = document.querySelectorAll("path.axis");
    expect(axisPaths.length).toBe(Object.keys(data.axes).length);
  });

  it("should set correct default stroke attributes", () => {
    const data = loadFixture("minimal_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotAxes(data, svg, x, y);

    const axisPaths = document.querySelectorAll("path.axis");
    for (const path of axisPaths) {
      expect(path.getAttribute("stroke")).toBe("black");
      expect(path.getAttribute("stroke-width")).toBe("1.5");
      expect(path.getAttribute("stroke-opacity")).toBe("0.5");
    }
  });

  it("should handle data with many axes", () => {
    const data = loadFixture("full_kwargs_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotAxes(data, svg, x, y);

    const axisPaths = document.querySelectorAll("path.axis");
    expect(axisPaths.length).toBe(Object.keys(data.axes).length);
  });
});

// ===========================================================================
// plotNodes
// ===========================================================================

describe("plotNodes", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should create correct number of circles across all axes", () => {
    const data = loadFixture("minimal_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    const nodes = document.querySelectorAll("circle.node");
    let expectedCount = 0;
    for (const ax of Object.keys(data.axes)) {
      expectedCount += data.axes[ax].nodes.unique_id.length;
    }
    expect(nodes.length).toBe(expectedCount);
  });

  it("should set correct cx and cy from scaled coordinates", () => {
    const data = loadFixture("minimal_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    const nodes = document.querySelectorAll("circle.node");
    // First axis, first node
    const firstAxisKey = Object.keys(data.axes)[0];
    const firstX = data.axes[firstAxisKey].nodes.x[0];
    const firstY = data.axes[firstAxisKey].nodes.y[0];
    const firstNode = nodes[0];
    expect(parseFloat(firstNode.getAttribute("cx"))).toBeCloseTo(x(firstX), 1);
    expect(parseFloat(firstNode.getAttribute("cy"))).toBeCloseTo(y(firstY), 1);
  });

  it("should use defaults when node_viz_kwargs is absent", () => {
    const data = loadFixture("minimal_hive_plot.json");
    delete data.node_viz_kwargs;
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    const nodes = document.querySelectorAll("circle.node");
    const firstNode = nodes[0];
    expect(firstNode.getAttribute("fill")).toBe("black");
    expect(parseFloat(firstNode.getAttribute("fill-opacity"))).toBeCloseTo(
      0.8,
      1,
    );
    expect(parseFloat(firstNode.getAttribute("r"))).toBeCloseTo(
      scatterSizeToRadius(20),
      1,
    );
    expect(firstNode.getAttribute("stroke")).toBe("none");
  });

  it("should apply colormap when c is numeric array with cmap", () => {
    const data = loadFixture("full_kwargs_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    // All axes have c as numeric array + cmap="viridis"
    const nodes = document.querySelectorAll("circle.node");
    // Fill should be a color string from the viridis scale, not a number
    expect(nodes[0].getAttribute("fill")).toMatch(/^(rgb|#)/);
  });

  it("should apply scalar size from node_viz_kwargs", () => {
    const data = loadFixture("full_kwargs_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    // All axes have s: 30
    const nodes = document.querySelectorAll("circle.node");
    expect(parseFloat(nodes[0].getAttribute("r"))).toBeCloseTo(
      scatterSizeToRadius(30),
      2,
    );
  });

  it("should apply scalar alpha from node_viz_kwargs", () => {
    const data = loadFixture("full_kwargs_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    // All axes have alpha: 0.8
    const nodes = document.querySelectorAll("circle.node");
    expect(parseFloat(nodes[0].getAttribute("fill-opacity"))).toBeCloseTo(
      0.8,
      1,
    );
  });

  it("should apply edgecolor from node_viz_kwargs", () => {
    const data = loadFixture("full_kwargs_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    // All axes have edgecolor: "black"
    const nodes = document.querySelectorAll("circle.node");
    expect(nodes[0].getAttribute("stroke")).toBe("black");
  });

  it("should apply per-node explicit color array from node_viz_kwargs", () => {
    // Inline data: explicit color strings per node
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          angle: 0,
          long_name: "A",
          nodes: { unique_id: [0, 1, 2], x: [2, 3, 4], y: [0, 0, 0] },
        },
      },
      edges: {},
      node_viz_kwargs: {
        A: { c: ["#FF0000", "#00FF00", "#0000FF"] },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    const nodes = document.querySelectorAll("circle.node");
    expect(nodes[0].getAttribute("fill")).toBe("#FF0000");
    expect(nodes[1].getAttribute("fill")).toBe("#00FF00");
    expect(nodes[2].getAttribute("fill")).toBe("#0000FF");
  });

  it("should apply per-node size array from node_viz_kwargs", () => {
    // Inline data: per-node size array
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          angle: 0,
          long_name: "A",
          nodes: { unique_id: [0, 1, 2], x: [2, 3, 4], y: [0, 0, 0] },
        },
      },
      edges: {},
      node_viz_kwargs: {
        A: { s: [10, 30, 50] },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    const nodes = document.querySelectorAll("circle.node");
    expect(parseFloat(nodes[0].getAttribute("r"))).toBeCloseTo(
      scatterSizeToRadius(10),
      2,
    );
    expect(parseFloat(nodes[1].getAttribute("r"))).toBeCloseTo(
      scatterSizeToRadius(30),
      2,
    );
    expect(parseFloat(nodes[2].getAttribute("r"))).toBeCloseTo(
      scatterSizeToRadius(50),
      2,
    );
  });

  it("should apply facecolor alias from node_viz_kwargs", () => {
    // Inline data: facecolor alias
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          angle: 0,
          long_name: "A",
          nodes: { unique_id: [0, 1], x: [2, 4], y: [0, 0] },
        },
      },
      edges: {},
      node_viz_kwargs: {
        A: { facecolor: "purple" },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    const nodes = document.querySelectorAll("circle.node");
    expect(nodes[0].getAttribute("fill")).toBe("purple");
    expect(nodes[1].getAttribute("fill")).toBe("purple");
  });

  it("should apply per-node alpha array from node_viz_kwargs", () => {
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          angle: 0,
          long_name: "A",
          nodes: { unique_id: [0, 1, 2], x: [2, 3, 4], y: [0, 0, 0] },
        },
      },
      edges: {},
      node_viz_kwargs: {
        A: { alpha: [0.2, 0.5, 0.9] },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    const nodes = document.querySelectorAll("circle.node");
    expect(parseFloat(nodes[0].getAttribute("fill-opacity"))).toBeCloseTo(
      0.2,
      1,
    );
    expect(parseFloat(nodes[1].getAttribute("fill-opacity"))).toBeCloseTo(
      0.5,
      1,
    );
    expect(parseFloat(nodes[2].getAttribute("fill-opacity"))).toBeCloseTo(
      0.9,
      1,
    );
  });

  it("should handle axis with zero nodes gracefully", () => {
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [], x: [], y: [] },
        },
      },
      edges: {},
    };
    const { svg, x, y } = getTestSVG();
    // Should not throw
    plotNodes(data, svg, x, y);
    expect(document.querySelectorAll("circle.node").length).toBe(0);
  });

  it("should apply per-node edgecolor array from node_viz_kwargs", () => {
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          angle: 0,
          long_name: "A",
          nodes: { unique_id: [0, 1, 2], x: [2, 3, 4], y: [0, 0, 0] },
        },
      },
      edges: {},
      node_viz_kwargs: {
        A: { edgecolor: ["red", "blue", "green"] },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    const nodes = document.querySelectorAll("circle.node");
    expect(nodes[0].getAttribute("stroke")).toBe("red");
    expect(nodes[1].getAttribute("stroke")).toBe("blue");
    expect(nodes[2].getAttribute("stroke")).toBe("green");
  });
});

// ===========================================================================
// plotEdges
// ===========================================================================

describe("plotEdges", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should create correct number of edge paths", () => {
    const data = loadFixture("minimal_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    expect(edges.length).toBe(countEdges(data));
  });

  it("should render ALL tags per axis pair (break bug regression test)", () => {
    const data = loadFixture("multi_tag_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    // All edges from all tags should render
    expect(edges.length).toBe(countEdges(data));
    // Both tag colors should be present
    const strokes = Array.from(edges).map((e) => e.getAttribute("stroke"));
    expect(strokes).toContain("#FF0000"); // tag_red
    expect(strokes).toContain("#0000FF"); // tag_blue
  });

  it("should apply scalar color from edge_kwargs", () => {
    const data = loadFixture("minimal_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    // All edges in minimal fixture have color="#006BA4"
    const edges = document.querySelectorAll("path.edge");
    for (const edge of edges) {
      expect(edge.getAttribute("stroke")).toBe("#006BA4");
    }
  });

  it("should apply per-edge color array", () => {
    // Inline data: per-edge color array
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [0, 1, 2], x: [2, 3, 4], y: [0, 0, 0] },
        },
        B: {
          start: [0, 1],
          end: [0, 5],
          nodes: { unique_id: [3, 4, 5], x: [0, 0, 0], y: [2, 3, 4] },
        },
      },
      edges: {
        A: {
          B: {
            0: {
              ids: [
                [0, 3],
                [1, 4],
                [2, 5],
              ],
              curves: [
                [
                  [2, 0],
                  [1, 1],
                  [0, 2],
                ],
                [
                  [3, 0],
                  [1.5, 1.5],
                  [0, 3],
                ],
                [
                  [4, 0],
                  [2, 2],
                  [0, 4],
                ],
              ],
              edge_kwargs: { color: ["#FF0000", "#00FF00", "#0000FF"] },
            },
          },
        },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    expect(edges[0].getAttribute("stroke")).toBe("#FF0000");
    expect(edges[1].getAttribute("stroke")).toBe("#00FF00");
    expect(edges[2].getAttribute("stroke")).toBe("#0000FF");
  });

  it("should apply per-edge alpha array", () => {
    // Inline data: per-edge alpha array
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [0, 1, 2], x: [2, 3, 4], y: [0, 0, 0] },
        },
        B: {
          start: [0, 1],
          end: [0, 5],
          nodes: { unique_id: [3, 4, 5], x: [0, 0, 0], y: [2, 3, 4] },
        },
      },
      edges: {
        A: {
          B: {
            0: {
              ids: [
                [0, 3],
                [1, 4],
                [2, 5],
              ],
              curves: [
                [
                  [2, 0],
                  [1, 1],
                  [0, 2],
                ],
                [
                  [3, 0],
                  [1.5, 1.5],
                  [0, 3],
                ],
                [
                  [4, 0],
                  [2, 2],
                  [0, 4],
                ],
              ],
              edge_kwargs: { alpha: [0.3, 0.6, 0.9] },
            },
          },
        },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    expect(parseFloat(edges[0].getAttribute("stroke-opacity"))).toBeCloseTo(
      0.3,
      1,
    );
    expect(parseFloat(edges[1].getAttribute("stroke-opacity"))).toBeCloseTo(
      0.6,
      1,
    );
    expect(parseFloat(edges[2].getAttribute("stroke-opacity"))).toBeCloseTo(
      0.9,
      1,
    );
  });

  it("should apply per-edge linewidth array", () => {
    // Inline data: per-edge linewidth array
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [0, 1, 2], x: [2, 3, 4], y: [0, 0, 0] },
        },
        B: {
          start: [0, 1],
          end: [0, 5],
          nodes: { unique_id: [3, 4, 5], x: [0, 0, 0], y: [2, 3, 4] },
        },
      },
      edges: {
        A: {
          B: {
            0: {
              ids: [
                [0, 3],
                [1, 4],
                [2, 5],
              ],
              curves: [
                [
                  [2, 0],
                  [1, 1],
                  [0, 2],
                ],
                [
                  [3, 0],
                  [1.5, 1.5],
                  [0, 3],
                ],
                [
                  [4, 0],
                  [2, 2],
                  [0, 4],
                ],
              ],
              edge_kwargs: { linewidth: [1.0, 2.0, 3.0] },
            },
          },
        },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    expect(parseFloat(edges[0].getAttribute("stroke-width"))).toBeCloseTo(
      1.0,
      1,
    );
    expect(parseFloat(edges[1].getAttribute("stroke-width"))).toBeCloseTo(
      2.0,
      1,
    );
    expect(parseFloat(edges[2].getAttribute("stroke-width"))).toBeCloseTo(
      3.0,
      1,
    );
  });

  it("should apply colormap when array + cmap present", () => {
    // Inline data: array + cmap
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [0, 1], x: [2, 4], y: [0, 0] },
        },
        B: {
          start: [0, 1],
          end: [0, 5],
          nodes: { unique_id: [2, 3], x: [0, 0], y: [2, 4] },
        },
      },
      edges: {
        A: {
          B: {
            0: {
              ids: [
                [0, 2],
                [1, 3],
              ],
              curves: [
                [
                  [2, 0],
                  [1, 1],
                  [0, 2],
                ],
                [
                  [4, 0],
                  [2, 2],
                  [0, 4],
                ],
              ],
              edge_kwargs: {
                array: [0.2, 0.8],
                cmap: "viridis",
                clim: [0.0, 1.0],
              },
            },
          },
        },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    // Should be color strings from viridis scale
    expect(edges[0].getAttribute("stroke")).toMatch(/^(rgb|#)/);
    expect(edges[1].getAttribute("stroke")).toMatch(/^(rgb|#)/);
    // The two should differ since 0.2 and 0.8 are different values
    expect(edges[0].getAttribute("stroke")).not.toBe(
      edges[1].getAttribute("stroke"),
    );
  });

  it("should apply data-dependent edge kwargs (array + cmap + per-edge alpha)", () => {
    // Simulates output of to_json() with data-dependent array resolved from edge data column
    // alongside explicit per-edge alpha arrays (the combination produced by
    // update_edge_plotting_keyword_arguments + add_edge_kwargs)
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [0, 1, 2], x: [2, 3, 4], y: [0, 0, 0] },
        },
        B: {
          start: [0, 1],
          end: [0, 5],
          nodes: { unique_id: [3, 4, 5], x: [0, 0, 0], y: [2, 3, 4] },
        },
      },
      edges: {
        A: {
          B: {
            0: {
              ids: [
                [0, 3],
                [1, 4],
                [2, 5],
              ],
              curves: [
                [
                  [2, 0],
                  [1, 1],
                  [0, 2],
                ],
                [
                  [3, 0],
                  [1.5, 1.5],
                  [0, 3],
                ],
                [
                  [4, 0],
                  [2, 2],
                  [0, 4],
                ],
              ],
              edge_kwargs: {
                array: [3.5, 7.0, 5.2],
                cmap: "cividis",
                clim: [0, 10],
                alpha: [0.3, 0.6, 0.9],
                linewidth: 2.0,
              },
            },
          },
        },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    expect(edges.length).toBe(3);
    // Colors should come from cividis colormap (not default black)
    for (const edge of edges) {
      expect(edge.getAttribute("stroke")).toMatch(/^(rgb|#)/);
      expect(edge.getAttribute("stroke")).not.toBe("black");
    }
    // Different array values should produce different colors
    expect(edges[0].getAttribute("stroke")).not.toBe(
      edges[1].getAttribute("stroke"),
    );
    // Per-edge alpha should be applied
    expect(parseFloat(edges[0].getAttribute("stroke-opacity"))).toBeCloseTo(
      0.3,
      1,
    );
    expect(parseFloat(edges[1].getAttribute("stroke-opacity"))).toBeCloseTo(
      0.6,
      1,
    );
    expect(parseFloat(edges[2].getAttribute("stroke-opacity"))).toBeCloseTo(
      0.9,
      1,
    );
    // Scalar linewidth should be applied to all
    for (const edge of edges) {
      expect(parseFloat(edge.getAttribute("stroke-width"))).toBeCloseTo(2.0, 1);
    }
  });

  it("should use colormap array over explicit color when both present", () => {
    // When both array+cmap and color are present, array+cmap takes priority
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [0, 1], x: [2, 4], y: [0, 0] },
        },
        B: {
          start: [0, 1],
          end: [0, 5],
          nodes: { unique_id: [2, 3], x: [0, 0], y: [2, 4] },
        },
      },
      edges: {
        A: {
          B: {
            0: {
              ids: [
                [0, 2],
                [1, 3],
              ],
              curves: [
                [
                  [2, 0],
                  [1, 1],
                  [0, 2],
                ],
                [
                  [4, 0],
                  [2, 2],
                  [0, 4],
                ],
              ],
              edge_kwargs: {
                array: [0.2, 0.8],
                cmap: "viridis",
                clim: [0.0, 1.0],
                color: ["#FF0000", "#0000FF"],
              },
            },
          },
        },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    // Colors should come from viridis colormap, NOT from explicit color array
    expect(edges[0].getAttribute("stroke")).not.toBe("#FF0000");
    expect(edges[1].getAttribute("stroke")).not.toBe("#0000FF");
    expect(edges[0].getAttribute("stroke")).toMatch(/^(rgb|#)/);
  });

  it("should apply stroke-dasharray for dashed linestyle", () => {
    // Inline data: linestyle "--"
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [0], x: [2], y: [0] },
        },
        B: {
          start: [0, 1],
          end: [0, 5],
          nodes: { unique_id: [1], x: [0], y: [2] },
        },
      },
      edges: {
        A: {
          B: {
            0: {
              ids: [[0, 1]],
              curves: [
                [
                  [2, 0],
                  [1, 1],
                  [0, 2],
                ],
              ],
              edge_kwargs: { linestyle: "--" },
            },
          },
        },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edge = document.querySelector("path.edge");
    expect(edge.getAttribute("stroke-dasharray")).toBe("5,5");
  });

  it("should use defaults when edge_kwargs is missing", () => {
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [0], x: [2], y: [0] },
        },
        B: {
          start: [0, 1],
          end: [0, 5],
          nodes: { unique_id: [1], x: [0], y: [2] },
        },
      },
      edges: {
        A: {
          B: {
            0: {
              ids: [[0, 1]],
              curves: [
                [
                  [2, 0],
                  [1, 1],
                  [0, 2],
                ],
              ],
            },
          },
        },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edge = document.querySelector("path.edge");
    expect(edge.getAttribute("stroke")).toBe("black");
    expect(parseFloat(edge.getAttribute("stroke-opacity"))).toBeCloseTo(0.5, 1);
    expect(parseFloat(edge.getAttribute("stroke-width"))).toBeCloseTo(1.5, 1);
  });

  it("should set fill to none on all edges", () => {
    const data = loadFixture("minimal_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    for (const edge of edges) {
      expect(edge.getAttribute("fill")).toBe("none");
    }
  });

  it("should handle empty edges dict gracefully", () => {
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [0], x: [2], y: [0] },
        },
      },
      edges: {},
    };
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);
    expect(document.querySelectorAll("path.edge").length).toBe(0);
  });

  it("should handle missing edges key gracefully", () => {
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [0], x: [2], y: [0] },
        },
      },
    };
    const { svg, x, y } = getTestSVG();
    // Should not throw
    plotEdges(data, svg, x, y);
    expect(document.querySelectorAll("path.edge").length).toBe(0);
  });

  it("should fall back to d3.extent when clim is absent with array + cmap", () => {
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [0, 1], x: [2, 4], y: [0, 0] },
        },
        B: {
          start: [0, 1],
          end: [0, 5],
          nodes: { unique_id: [2, 3], x: [0, 0], y: [2, 4] },
        },
      },
      edges: {
        A: {
          B: {
            0: {
              ids: [
                [0, 2],
                [1, 3],
              ],
              curves: [
                [
                  [2, 0],
                  [1, 1],
                  [0, 2],
                ],
                [
                  [4, 0],
                  [2, 2],
                  [0, 4],
                ],
              ],
              edge_kwargs: {
                array: [0.2, 0.8],
                cmap: "viridis",
              },
            },
          },
        },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    expect(edges[0].getAttribute("stroke")).toMatch(/^(rgb|#)/);
    expect(edges[1].getAttribute("stroke")).toMatch(/^(rgb|#)/);
    expect(edges[0].getAttribute("stroke")).not.toBe(
      edges[1].getAttribute("stroke"),
    );
  });

  it("should apply per-edge linestyle array", () => {
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          nodes: { unique_id: [0, 1, 2], x: [2, 3, 4], y: [0, 0, 0] },
        },
        B: {
          start: [0, 1],
          end: [0, 5],
          nodes: { unique_id: [3, 4, 5], x: [0, 0, 0], y: [2, 3, 4] },
        },
      },
      edges: {
        A: {
          B: {
            0: {
              ids: [
                [0, 3],
                [1, 4],
                [2, 5],
              ],
              curves: [
                [
                  [2, 0],
                  [1, 1],
                  [0, 2],
                ],
                [
                  [3, 0],
                  [1.5, 1.5],
                  [0, 3],
                ],
                [
                  [4, 0],
                  [2, 2],
                  [0, 4],
                ],
              ],
              edge_kwargs: { linestyle: ["--", ":", "-"] },
            },
          },
        },
      },
    };
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    expect(edges[0].getAttribute("stroke-dasharray")).toBe("5,5");
    expect(edges[1].getAttribute("stroke-dasharray")).toBe("2,2");
    expect(edges[2].getAttribute("stroke-dasharray")).toBeNull();
  });
});

// ===========================================================================
// plotLabels
// ===========================================================================

describe("plotLabels", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should create one text.axis-label per axis", () => {
    const data = loadFixture("minimal_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotLabels(data, svg, x, y);

    const labels = document.querySelectorAll("text.axis-label");
    expect(labels.length).toBe(Object.keys(data.axes).length);
  });

  it("should use long_name as text content", () => {
    const data = loadFixture("minimal_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotLabels(data, svg, x, y);

    const labels = document.querySelectorAll("text.axis-label");
    const labelTexts = Array.from(labels).map((l) => l.textContent);
    // Verify all axis long_names appear
    for (const axKey of Object.keys(data.axes)) {
      expect(labelTexts).toContain(data.axes[axKey].long_name);
    }
  });

  it("should fall back to axis key when long_name is absent", () => {
    const data = {
      axes: {
        MyAxis: {
          start: [1, 0],
          end: [5, 0],
          angle: 0,
          nodes: { unique_id: [], x: [], y: [] },
        },
      },
      edges: {},
    };
    const { svg, x, y } = getTestSVG();
    plotLabels(data, svg, x, y);

    const label = document.querySelector("text.axis-label");
    expect(label.textContent).toBe("MyAxis");
  });

  it("should skip axes without angle (backward compat)", () => {
    const data = {
      axes: {
        A: {
          start: [1, 0],
          end: [5, 0],
          // no angle key
          nodes: { unique_id: [], x: [], y: [] },
        },
      },
      edges: {},
    };
    const { svg, x, y } = getTestSVG();
    plotLabels(data, svg, x, y);

    const labels = document.querySelectorAll("text.axis-label");
    expect(labels.length).toBe(0);
  });

  it("should use text-anchor 'start' for angle 0 (rightward axis)", () => {
    const data = loadFixture("minimal_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotLabels(data, svg, x, y);

    const labels = document.querySelectorAll("text.axis-label");
    // Find the axis with angle 0
    const axisA = Object.entries(data.axes).find(([, v]) => v.angle === 0);
    const labelName = axisA[1].long_name || axisA[0];
    const label = Array.from(labels).find((l) => l.textContent === labelName);
    expect(label.getAttribute("text-anchor")).toBe("start");
  });

  it("should use text-anchor 'end' for angle 120 (upper-left axis)", () => {
    const data = loadFixture("minimal_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotLabels(data, svg, x, y);

    const labels = document.querySelectorAll("text.axis-label");
    // Find the axis with angle 120
    const axisB = Object.entries(data.axes).find(([, v]) => v.angle === 120);
    const labelName = axisB[1].long_name || axisB[0];
    const label = Array.from(labels).find((l) => l.textContent === labelName);
    expect(label.getAttribute("text-anchor")).toBe("end");
  });

  it("should use text-anchor 'middle' for angle 90 (upward axis)", () => {
    const data = {
      axes: {
        Up: {
          start: [0, 1],
          end: [0, 5],
          angle: 90,
          long_name: "Up",
          nodes: { unique_id: [], x: [], y: [] },
        },
      },
      edges: {},
    };
    const { svg, x, y } = getTestSVG();
    plotLabels(data, svg, x, y);

    const label = document.querySelector("text.axis-label");
    expect(label.getAttribute("text-anchor")).toBe("middle");
  });

  it("should set font-size from options", () => {
    const data = loadFixture("minimal_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotLabels(data, svg, x, y, { fontSize: 20 });

    const label = document.querySelector("text.axis-label");
    expect(label.getAttribute("font-size")).toBe("20");
  });
});

// ===========================================================================
// visualizeHivePlot (integration)
// ===========================================================================

describe("visualizeHivePlot", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should render all elements with in-memory data", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    await visualizeHivePlot(
      data,
      [-5, 5],
      [-5, 5],
      0,
      0,
      0,
      0,
      450,
      450,
      "body",
    );

    const numAxes = Object.keys(data.axes).length;
    let numNodes = 0;
    for (const ax of Object.keys(data.axes)) {
      numNodes += data.axes[ax].nodes.unique_id.length;
    }

    expect(document.querySelectorAll("path.axis").length).toBe(numAxes);
    expect(document.querySelectorAll("circle.node").length).toBe(numNodes);
    expect(document.querySelectorAll("path.edge").length).toBe(
      countEdges(data),
    );
    expect(document.querySelectorAll("text.axis-label").length).toBe(numAxes);
  });

  it("should suppress labels when showLabels is false", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    await visualizeHivePlot(
      data,
      [-5, 5],
      [-5, 5],
      0,
      0,
      0,
      0,
      450,
      450,
      "body",
      {
        showLabels: false,
      },
    );

    expect(document.querySelectorAll("path.axis").length).toBe(
      Object.keys(data.axes).length,
    );
    expect(document.querySelectorAll("text.axis-label").length).toBe(0);
  });

  it("should return an SVG selection", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    const result = await visualizeHivePlot(
      data,
      [-5, 5],
      [-5, 5],
      0,
      0,
      0,
      0,
      450,
      450,
      "body",
    );
    expect(result).toBeDefined();
  });

  it("should render full_kwargs data correctly", async () => {
    const data = loadFixture("full_kwargs_hive_plot.json");
    await visualizeHivePlot(
      data,
      [-5, 5],
      [-5, 5],
      0,
      0,
      0,
      0,
      450,
      450,
      "body",
    );

    const numAxes = Object.keys(data.axes).length;
    let numNodes = 0;
    for (const ax of Object.keys(data.axes)) {
      numNodes += data.axes[ax].nodes.unique_id.length;
    }

    expect(document.querySelectorAll("path.axis").length).toBe(numAxes);
    expect(document.querySelectorAll("circle.node").length).toBe(numNodes);
    expect(document.querySelectorAll("path.edge").length).toBe(
      countEdges(data),
    );
    expect(document.querySelectorAll("text.axis-label").length).toBe(numAxes);
  });

  it("should render full_kwargs fixture with data-dependent edge color, alpha, and linewidth", () => {
    const data = loadFixture("full_kwargs_hive_plot.json");
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    expect(edges.length).toBe(countEdges(data));
    for (const edge of edges) {
      // Color should come from cividis colormap (array+cmap), not default black
      expect(edge.getAttribute("stroke")).toMatch(/^(rgb|#)/);
      expect(edge.getAttribute("stroke")).not.toBe("black");
      // Alpha should come from per-edge "alpha_scaled" column (~0.3-1.0), not default 0.5
      const alpha = parseFloat(edge.getAttribute("stroke-opacity"));
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThanOrEqual(1);
      // Linewidth should come from per-edge "lw_scaled" column (~1.0-3.3), not default 1.5
      const lw = parseFloat(edge.getAttribute("stroke-width"));
      expect(lw).toBeGreaterThan(0);
    }
  });

  it("should load data from URL string via d3.json and render", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    const spy = vi.spyOn(d3, "json").mockResolvedValue(data);

    await visualizeHivePlot(
      "http://example.com/data.json",
      [-5, 5],
      [-5, 5],
      0,
      0,
      0,
      0,
      450,
      450,
      "body",
    );

    expect(spy).toHaveBeenCalledWith("http://example.com/data.json");
    expect(document.querySelectorAll("path.axis").length).toBe(
      Object.keys(data.axes).length,
    );
    expect(document.querySelectorAll("circle.node").length).toBeGreaterThan(0);
    expect(document.querySelectorAll("path.edge").length).toBe(
      countEdges(data),
    );
    spy.mockRestore();
  });
});

// ===========================================================================
// Backward compatibility
// ===========================================================================

describe("backward compatibility", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should render example_hive_plot.json without errors", () => {
    const data = loadExampleHivePlot();
    const { svg, x, y } = getTestSVG();

    // Should not throw
    plotEdges(data, svg, x, y);
    plotAxes(data, svg, x, y);
    plotNodes(data, svg, x, y);
    plotLabels(data, svg, x, y);

    // Should have rendered some elements
    expect(document.querySelectorAll("path.axis").length).toBeGreaterThan(0);
    expect(document.querySelectorAll("circle.node").length).toBeGreaterThan(0);
  });

  it("should use default node styling when node_viz_kwargs is empty", () => {
    const data = loadExampleHivePlot();
    const { svg, x, y } = getTestSVG();
    plotNodes(data, svg, x, y);

    const nodes = document.querySelectorAll("circle.node");
    expect(nodes.length).toBeGreaterThan(0);
    // With empty node_viz_kwargs, should use defaults
    expect(nodes[0].getAttribute("fill")).toBe("black");
  });

  it("should render example edges with correct colors from edge_kwargs", () => {
    const data = loadExampleHivePlot();
    const { svg, x, y } = getTestSVG();
    plotEdges(data, svg, x, y);

    const edges = document.querySelectorAll("path.edge");
    expect(edges.length).toBeGreaterThan(0);
    // Each edge should have a stroke color (from edge_kwargs.color)
    for (const edge of edges) {
      expect(edge.getAttribute("stroke")).toBeTruthy();
      expect(edge.getAttribute("stroke")).not.toBe("black"); // example has specific colors
    }
  });
});
