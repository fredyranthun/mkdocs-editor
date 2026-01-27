# Configuration

Learn how to configure your MkDocs site.

## Basic Settings

Edit `mkdocs.yml` to configure your site:

```yaml
site_name: My Site
site_url: https://mysite.com/
```

## Theme Options

The Material theme offers many customization options:

| Option    | Description   | Default  |
| --------- | ------------- | -------- |
| `primary` | Primary color | `indigo` |
| `accent`  | Accent color  | `indigo` |
| `font`    | Font family   | `Roboto` |

!!! warning "Color Scheme"
Make sure your color choices have sufficient contrast for accessibility.

## Extensions

Enable markdown extensions in your config:

```yaml
markdown_extensions:
  - admonition
  - pymdownx.superfences
  - tables
```
