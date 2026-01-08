# Table to CSV Exporter - Chrome Extension

A Chrome extension that allows you to export an HTML table from any website to CSV format with a single click.

## Features

- **Automatic Table Detection**: Scans and detects all visible tables on any webpage
- **Smart Naming**: Automatically names tables based on captions, headings, or IDs
- **Individual Export**: Export specific tables one at a time
- **Bulk Export**: Export all tables from a page simultaneously
- **Clean CSV Format**: Properly formatted CSV with escaped special characters
- **Manifest V3**: Built with the latest Chrome Extension standards

## Installation

### Load as Unpacked Extension (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right
4. Click "Load unpacked"
5. Select the `public` folder from this project
6. The extension icon should appear in your Chrome toolbar

## How to Use

1. **Navigate to any webpage** with HTML tables
2. **Click the extension icon** in your Chrome toolbar
3. **View detected tables**: The popup will show all tables found on the page with:
   - Table title (auto-detected from captions, headings, or IDs)
   - Number of rows and columns
4. **Export options**:
   - Click on any individual table to export it as CSV
   - Click "Export All Tables" button to download all tables at once
5. **Files are automatically downloaded** to your default downloads folder

## Table Detection

The extension intelligently detects tables by:

- Finding all `<table>` elements on the page
- Filtering out hidden or invisible tables
- Extracting table data including headers (`<th>`) and cells (`<td>`)
- Handling colspan attributes correctly
- Normalizing table data to ensure consistent column counts

## Table Naming

Tables are named using this priority:

1. `<caption>` element text
2. Preceding heading element (H1-H6)
3. `aria-label` attribute
4. `id` attribute
5. Default: "Table 1", "Table 2", etc.

## CSV Format

The exported CSV files:

- Use comma (`,`) as delimiter
- Properly escape cells containing commas, quotes, or newlines
- Use double quotes for escaping
- Include all rows and columns from the table
- Preserve header rows

## Technical Details

### Permissions

- `activeTab`: Access to the current active tab
- `scripting`: Ability to inject content scripts

### Content Script

- Runs on all URLs (`<all_urls>`)
- Detects and extracts table data
- Filters visible tables only
- Handles complex table structures

### Popup Interface

- Built with vanilla JavaScript
- Modern CSS with gradients and animations
- Responsive design
- Real-time table scanning

## Browser Compatibility

- Chrome 88+
- Microsoft Edge 88+
- Any Chromium-based browser supporting Manifest V3

## Troubleshooting

### No Tables Detected

- Ensure the page has actual `<table>` HTML elements
- Some modern sites use `<div>` elements styled as tables (not supported)
- Check if tables are hidden (display: none, visibility: hidden)
- Try refreshing the page and reopening the extension

### Extension Not Working

- Refresh the page after installing the extension
- Check Chrome's extension page for errors
- Ensure Developer Mode is enabled
- Try removing and re-adding the extension

### CSV Format Issues

- Excel users: Import CSV using "Data > From Text/CSV" for best results
- Special characters: The extension properly escapes quotes and commas
- Line breaks: Preserved within quoted cells

## Future Enhancements

Possible features for future versions:
- Custom delimiter selection (semicolon, tab, pipe)
- Table filtering and column selection
- Keyboard shortcuts
- Dark mode support

## License

MIT License - Feel free to use and modify for your needs

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
