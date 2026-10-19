## 2. Existing GeoJSON Dataset and Data Model

An existing GeoJSON dataset is available containing OpenStreetMap lighthouse features. Individual features follow the standard GeoJSON Feature structure, with a `properties` object and a Point geometry.

Example properties include:

- `name`
- `man_made`
- `@id`
- `seamark:type`
- `seamark:light:1:character`
- `seamark:light:1:colour`
- `seamark:light:1:height`
- `seamark:light:1:period`
- `seamark:light:1:sector_start`
- `seamark:light:1:sector_end`
- `seamark:fog_signal:category`
- `seamark:fog_signal:period`
- `ruins`
- `building`
- `ref:canmore`
- `wikidata`
- `source`

These are examples, not an exhaustive or mandatory property list. Features may contain different properties depending on the available OpenStreetMap data.

### Requirements

- Inspect the existing repository to locate the actual GeoJSON file and determine its structure before implementing the feature.
- Treat the existing dataset as the source of truth. Do not replace it, recreate it, rename its source properties or discard information.
- Preserve feature IDs, OSM identifiers, original tags and coordinates.
- Use the GeoJSON geometry's `coordinates` array as the authoritative location, following GeoJSON coordinate order: `[longitude, latitude]`.
- Support the existing Point geometries. Do not assume every feature has a particular optional property.
- Do not invent missing data or infer operational status solely from a feature's name.
- If the dataset is a `FeatureCollection`, load it directly using the existing project conventions.
- If the dataset needs preprocessing for display or searching, derive a typed presentation model at runtime or through a reproducible build-time script. Preserve the original source data.

### Data validation

Handle missing names, incomplete properties, invalid coordinates, unexpected values and duplicate features gracefully. Exclude invalid geometries from map rendering and report relevant validation issues without crashing the page.

Use stable identifiers such as the feature's GeoJSON `id` or `properties["@id"]` when available. Provide a deterministic fallback for features without an identifier.

Do not fetch external data at runtime unless the existing application explicitly requires it. The map should use the locally available dataset.

## 3. Lighthouse Information and Navigational Details

Create a human-readable presentation layer for the available OpenStreetMap properties.

### General information

Where available, display:

- Lighthouse or feature name
- Feature classification
- Navigational light type (`seamark:type`)
- Whether the feature is explicitly tagged as a ruin (`ruins=yes`)
- Relevant source references, such as `ref:canmore` or `wikidata`
- Original OpenStreetMap feature reference

Distinguish features explicitly tagged as ruins from other features. Do not assume every mapped feature is an active lighthouse, or that the absence of `ruins=yes` confirms that a structure is operational.

### Navigational light details

The source may contain multiple numbered groups of properties, such as `seamark:light:1:*`, `seamark:light:2:*` and `seamark:light:3:*`.

Implement a reusable parser that identifies numbered light groups dynamically rather than hard-coding support for only one, two or three lights.

For each available light group, display relevant fields in a readable layout:

- Light character, such as `Fl`
- Colour
- Height
- Period
- Sector start and end bearings
- Other relevant light properties when present

Preserve the original values. Clearly label measurements and units where these are known; do not assume that every source value has a unit unless the data specification supports it.

Display fog signal details when available, including category, group and period.

Do not display raw tag names as the primary user interface. Translate known tags into readable labels, but retain the original values and provide a way to inspect source tags if useful.

If no navigational details are available for a feature, display the available general information without showing empty sections.

## 4. Map Behaviour and Feature Selection

Use the existing Mapbox GL JS implementation and project conventions.

- Render valid lighthouse Point features from the local GeoJSON dataset.
- Use clustering when appropriate for the dataset size and zoom level.
- Distinguish explicitly tagged ruins visually from other features, while maintaining adequate contrast and accessibility.
- Allow users to select a feature and inspect its details.
- Ensure that selecting a feature highlights or otherwise identifies its map location.
- Support search by feature name and, where practical, filter by feature classification or explicitly tagged ruin status.
- Keep the map, selected feature and search results synchronised.
- Handle features with missing names or incomplete details gracefully.
- Include a reset-view control.

The initial map extent should be derived from the valid dataset coordinates where practical, with suitable padding. If the dataset covers Scotland, frame the relevant Scottish mainland and islands rather than assuming that a fixed centre and zoom will always fit the data.

## 5. Information Panel and Source Attribution

Provide an accessible feature-detail panel or popup with a clear hierarchy:

1. Feature name and classification
2. Ruin status, when explicitly tagged
3. Navigational light details
4. Fog signal details
5. Other useful source references
6. OpenStreetMap attribution and an appropriate link to the original feature when possible

Generate original OpenStreetMap feature links only when a valid OSM identifier and supported feature type are available. Escape and validate property values before inserting them into the interface.

Respect OpenStreetMap's attribution and licensing requirements. Do not present third-party source tags as independently verified operational information.
