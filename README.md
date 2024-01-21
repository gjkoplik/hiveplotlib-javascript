# hiveplotlib-javascript

JavaScript (D3) Code for Visualizing JSON outputs from [Hiveplotlib](https://gitlab.com/geomdata/hiveplotlib).

## Goal of This Repository

This repository is intended to reduce the barriers to entry for people to use hive plots for their network visualization
/ analysis. Specifically, if you are a back-end developer hoping to pass off Hiveplotlib outputs to a front-end team,
then this repository can hopefully accelerate that process.

## First Pass Code

(Last updated January, 2024.)

This code is only a first pass at D3 hive plots from the `hiveplotlib` JSON export.

I am *not* a JS developer, and only learned enough JS to get something working.

I attempted to respect JS code style, but inevitably slipped into Python coding practices.

There are also lots of "known unknowns" about JS coding that I'm sure experienced JS coders would immediately find.

[Pull requests](https://github.com/gjkoplik/hiveplotlib-javascript/pulls) are absolutely encouraged!

There are obvious improvements that can and should be made, most notably:

* Any changes necessary should be made to have this code meet JS developer standards.

* This code has not been rigorously tested, as the author is not familiar with JS testing frameworks. Tests should be
  formalized. These could be written to work off of a version-controlled JSON file that could be rebuilt by CI in the
  `hiveplotlib` repository.

* Full handling of hiveplotlib keyword arguments (e.g. for nodes, axes, and edges) should be validated / improved /
  documented as necessary. This should probably be done by exposing a mapping to the user between specific edge keyword
  arguments (e.g. `"line_width"` maps onto `"stroke-width"`). Since Hiveplotlib supports multiple Python visualization
  tools and the JSON exporter is meant to be language agnostic, there is no reason that these labels will be stable. For
  example, `"line_width"` could also come through as `"lw"`, `"width"`, and `"linewidth"`.

* Supporting *both* in-memory data in addition to data on disk would be a nice improvement.
