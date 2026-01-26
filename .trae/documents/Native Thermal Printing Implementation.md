# Native Thermal Printing Implementation Plan

This plan implements direct, driver-level printing for thermal printers (Xprinter, POS80) on macOS and Windows, bypassing the browser print dialog.

## 1. Rust Dependencies (Backend)
We will add the following crates to `src-tauri/Cargo.toml`:
- **`printers`**: For listing system printers and sending raw print jobs (supports CUPS on macOS and WinSpool on Windows).
- **`escpos-rs`**: For generating the specific byte commands (ESC/POS) required by thermal printers for formatting, cutting paper, and opening cash drawers.

## 2. Rust Backend Implementation (`src-tauri/src/printer/mod.rs`)
We will create a new module to handle printing logic:
1.  **`get_system_printers`**: A command to list all available printers so the user can select their thermal printer in Settings.
2.  **`print_receipt`**: A command that accepts the receipt data (Sales object) and:
    *   Formats the header (Logo, Business Name).
    *   Formats the items (Table layout).
    *   Formats the footer (Totals, Thank You message).
    *   Adds "Cut Paper" command.
    *   Sends the raw byte stream directly to the selected printer.

## 3. Frontend Integration
1.  **Settings Page Update**:
    *   Add a dropdown to `src/app/settings/index.tsx` to select the "Thermal Printer" from the list of system printers.
    *   Save this preference in the database/store.
2.  **Print Button Logic**:
    *   Modify `PrintInvoiceButton.tsx` (and others) to check if a native printer is configured.
    *   If yes -> Invoke the Rust `print_receipt` command.
    *   If no -> Fallback to the existing `window.print()` method.

## 4. Why this approach?
*   **Cross-Platform**: Works on both macOS (your dev env) and Windows (client env).
*   **Native Control**: Allows utilizing printer hardware features like the cutter.
*   **Speed**: Printing is instant (no dialog).
*   **Silent**: No user interaction required after clicking "Print".

## Verification
*   We will verify by listing printers on your macOS machine.
*   We will implement a "Test Print" button in settings to confirm the data path works.
