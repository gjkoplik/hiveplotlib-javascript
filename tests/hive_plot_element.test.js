import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

vi.mock("https://cdn.jsdelivr.net/npm/d3@7/+esm", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual };
});

// Import the element to trigger customElements.define
import "../hive_plot_element.js";

// ---------------------------------------------------------------------------
// Fixture loading helpers
// ---------------------------------------------------------------------------

function loadFixture(name) {
  const path = resolve(import.meta.dirname, "fixtures", name);
  return JSON.parse(readFileSync(path, "utf8"));
}

// Wait for async _render to complete
function waitForRender() {
  return new Promise((resolve) => queueMicrotask(resolve));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HivePlotElement", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should be registered as a custom element", () => {
    expect(customElements.get("hive-plot")).toBeDefined();
  });

  it("should render SVG when data property is set", async () => {
    const el = document.createElement("hive-plot");
    document.body.appendChild(el);
    el.data = loadFixture("minimal_hive_plot.json");
    await waitForRender();

    const svg = el.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("should render correct number of axes, nodes, and edges", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    const el = document.createElement("hive-plot");
    document.body.appendChild(el);
    el.data = data;
    await waitForRender();

    const axes = el.querySelectorAll("path.axis");
    expect(axes.length).toBe(Object.keys(data.axes).length);

    let totalNodes = 0;
    for (const axisName of Object.keys(data.axes)) {
      totalNodes += data.axes[axisName].nodes.unique_id.length;
    }
    const nodes = el.querySelectorAll("circle.node");
    expect(nodes.length).toBe(totalNodes);

    const edges = el.querySelectorAll("path.edge");
    expect(edges.length).toBeGreaterThan(0);
  });

  it("should include data attributes on rendered elements", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    const el = document.createElement("hive-plot");
    document.body.appendChild(el);
    el.data = data;
    await waitForRender();

    // Axes
    const axisA = el.querySelector('path.axis[data-axis="A"]');
    expect(axisA).not.toBeNull();

    // Nodes
    const nodesOnA = el.querySelectorAll('circle.node[data-axis="A"]');
    expect(nodesOnA.length).toBe(data.axes.A.nodes.unique_id.length);

    // Edges
    const edgesFromB = el.querySelectorAll('path.edge[data-source-axis="B"]');
    expect(edgesFromB.length).toBeGreaterThan(0);
    const edgesAll = el.querySelectorAll("path.edge");
    expect(edgesAll.length).toBeGreaterThan(0);
    expect(edgesAll.length).toBeGreaterThan(edgesFromB.length);
  });

  it("should suppress labels when show-labels is false", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    const el = document.createElement("hive-plot");
    el.setAttribute("show-labels", "false");
    document.body.appendChild(el);
    el.data = data;
    await waitForRender();

    const labels = el.querySelectorAll("text.axis-label");
    expect(labels.length).toBe(0);
  });

  it("should show labels by default", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    const el = document.createElement("hive-plot");
    document.body.appendChild(el);
    el.data = data;
    await waitForRender();

    const labels = el.querySelectorAll("text.axis-label");
    expect(labels.length).toBe(Object.keys(data.axes).length);
  });

  it("should re-render when data property changes", async () => {
    const el = document.createElement("hive-plot");
    document.body.appendChild(el);

    el.data = loadFixture("minimal_hive_plot.json");
    await waitForRender();
    const firstAxesCount = el.querySelectorAll("path.axis").length;

    el.data = loadFixture("multi_tag_hive_plot.json");
    await waitForRender();
    const secondAxesCount = el.querySelectorAll("path.axis").length;

    // multi_tag has more axes than minimal
    expect(secondAxesCount).toBeGreaterThan(firstAxesCount);
    // Should only have one SVG (old one removed)
    const svgs = el.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
  });

  it("should render nothing when no data or src is provided", async () => {
    const el = document.createElement("hive-plot");
    document.body.appendChild(el);
    await waitForRender();

    const svg = el.querySelector("svg");
    expect(svg).toBeNull();
  });

  it("should use width and height attributes", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    const el = document.createElement("hive-plot");
    el.setAttribute("width", "800");
    el.setAttribute("height", "600");
    document.body.appendChild(el);
    el.data = data;
    await waitForRender();

    const svg = el.querySelector("svg");
    expect(svg.getAttribute("width")).toBe("800");
    expect(svg.getAttribute("height")).toBe("600");
  });

  it("should use default dimensions when attributes are omitted", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    const el = document.createElement("hive-plot");
    document.body.appendChild(el);
    el.data = data;
    await waitForRender();

    const svg = el.querySelector("svg");
    expect(svg.getAttribute("width")).toBe("550");
    expect(svg.getAttribute("height")).toBe("550");
  });

  it("should fetch data from src attribute", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(data),
    });

    const el = document.createElement("hive-plot");
    // Set src before appending so connectedCallback uses the mock
    el.setAttribute("src", "test.json");
    document.body.appendChild(el);
    // Wait for async fetch + render
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(globalThis.fetch).toHaveBeenCalledWith("test.json");
    const svg = el.querySelector("svg");
    expect(svg).not.toBeNull();

    delete globalThis.fetch;
  });

  it("should dispatch hive-plot-rendered event after rendering", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    const el = document.createElement("hive-plot");
    document.body.appendChild(el);

    const rendered = new Promise((resolve) => {
      el.addEventListener("hive-plot-rendered", (e) => resolve(e.detail));
    });

    el.data = data;
    const detail = await rendered;
    expect(detail.data).toBe(data);
  });

  it("should return data via the getter", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    const el = document.createElement("hive-plot");
    document.body.appendChild(el);

    expect(el.data).toBeNull();
    el.data = data;
    expect(el.data).toBe(data);
  });

  it("should clear src when data property is set", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    // Mock fetch to avoid unhandled rejection from connectedCallback
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(data),
    });

    const el = document.createElement("hive-plot");
    el.setAttribute("src", "test.json");
    document.body.appendChild(el);

    el.data = data;
    expect(el.hasAttribute("src")).toBe(false);

    delete globalThis.fetch;
  });

  it("should re-render when a non-src attribute changes", async () => {
    const data = loadFixture("minimal_hive_plot.json");
    const el = document.createElement("hive-plot");
    document.body.appendChild(el);
    el.data = data;
    await waitForRender();

    // Change width — triggers attributeChangedCallback with name !== "src"
    el.setAttribute("width", "800");
    await waitForRender();

    const svg = el.querySelector("svg");
    expect(svg.getAttribute("width")).toBe("800");
  });

  it("should clear cached data and re-fetch when src attribute changes", async () => {
    const data1 = loadFixture("minimal_hive_plot.json");
    const data2 = loadFixture("multi_tag_hive_plot.json");
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve(data1) })
      .mockResolvedValueOnce({ json: () => Promise.resolve(data2) });

    const el = document.createElement("hive-plot");
    el.setAttribute("src", "first.json");
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const firstAxesCount = el.querySelectorAll("path.axis").length;

    el.setAttribute("src", "second.json");
    await new Promise((resolve) => setTimeout(resolve, 10));

    const secondAxesCount = el.querySelectorAll("path.axis").length;
    expect(secondAxesCount).toBeGreaterThan(firstAxesCount);
    expect(globalThis.fetch).toHaveBeenCalledWith("second.json");

    delete globalThis.fetch;
  });

  it("should dispatch hive-plot-error event on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const el = document.createElement("hive-plot");
    el.setAttribute("src", "bad-url.json");
    document.body.appendChild(el);

    const error = await new Promise((resolve) => {
      el.addEventListener("hive-plot-error", (e) => resolve(e.detail.error));
    });

    expect(error.message).toBe("Network error");
    expect(el.querySelector("svg")).toBeNull();

    delete globalThis.fetch;
  });

  it("should process pending render after current render completes", async () => {
    const minimal = loadFixture("minimal_hive_plot.json");
    const multiTag = loadFixture("multi_tag_hive_plot.json");

    const el = document.createElement("hive-plot");
    document.body.appendChild(el);

    // Trigger two renders in quick succession
    el.data = minimal;
    el.data = multiTag;
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should end up with the second dataset rendered
    const axes = el.querySelectorAll("path.axis");
    const multiTagAxesCount = Object.keys(multiTag.axes).length;
    expect(axes.length).toBe(multiTagAxesCount);
  });
});
