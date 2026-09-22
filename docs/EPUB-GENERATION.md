# EPUB Generation & Validation

## Build (`src/lib/epub/generate.ts`)

`buildEpub(project)` → `{ blob, filename }` using JSZip (dynamic import).

### Archive layout

```
mimetype                    (STORE, first entry — required)
META-INF/container.xml      → points to OEBPS/content.opf
OEBPS/content.opf           (EPUB 3 package doc)
OEBPS/nav.xhtml             (EPUB 3 TOC nav)
OEBPS/styles.css            (default book styles)
OEBPS/text/<slug>_<n>.xhtml (one per chapter)
OEBPS/images/cover.<ext>    (optional)
```

### content.opf
- `version="3.0"`, `unique-identifier="BookId"`
- dc:title, dc:creator, dc:language, optional dc:description/isbn/publisher/subject, dc:date
- `dcterms:modified` meta
- manifest: nav.xhtml (`properties="nav"`), chapter items, cover (`properties="cover-image"`), styles.css
- spine: `<itemref>` per chapter in order

### nav.xhtml
`<nav epub:type="toc">` with `<ol>` of chapter links, indented by `level`.

### Chapter XHTML
Wrapped in XHTML doctype + `xmlns`. If content doesn't start with `<h1-6>`, a heading is prepended at `level+1`.

### styles.css
Georgia serif, justified paragraphs with 1.5em indent, `p.dialogue`/`p.no-indent` zero-indent, centered h1, `hr::after` = `* * *`.

### Cover extension
Derived from `mimeType`: png / webp / else jpg. Base64 stripped from data URL before zip.

### Compression
DEFLATE level 6 for everything except `mimetype` (STORE).

### Download
`downloadBlob(blob, filename)` — object URL + synthetic `<a download>` click.

## Validation (`src/lib/epub/validate.ts`)

`validateEpub(file)` → `{ valid, issues[] }` with severity `error|warning|info`:

1. mimetype present & exact string
2. META-INF/container.xml present, has rootfile
3. OPF found, parses as XML, dc:title present (error); creator/language/identifier (warning)
4. manifest non-empty, spine non-empty
5. EPUB 3 nav document present (`properties="nav"`)
6. every manifest href exists in zip
7. every spine idref exists in manifest
8. chapter XHTML parses, has `<body>`
9. external `http(s)` links → info

`valid = no error-severity issues`.

UI: `/check` page renders counts + issue list.
