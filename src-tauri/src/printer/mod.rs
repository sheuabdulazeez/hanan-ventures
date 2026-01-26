use std::{io::Write};
use serde::{Deserialize, Serialize};

use printers::common::base::job::PrinterJobOptions;

use pdfium_render::prelude::*;
use image::{DynamicImage, GrayImage};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// =======================================================
/// ESC/POS BUILDER
/// =======================================================

pub struct EscPos {
    buffer: Vec<u8>,
}

impl EscPos {
    const ESC: u8 = 0x1B;
    const GS: u8 = 0x1D;
    const LF: u8 = 0x0A;

    pub fn new() -> Self {
        Self { buffer: Vec::new() }
    }

    pub fn init(&mut self) -> &mut Self {
        self.buffer.extend_from_slice(&[Self::ESC, 0x40]);
        self
    }

    pub fn align(&mut self, mode: u8) -> &mut Self {
        self.buffer.extend_from_slice(&[Self::ESC, 0x61, mode]);
        self
    }

    pub fn text(&mut self, text: &str) -> &mut Self {
        self.buffer.extend_from_slice(text.as_bytes());
        self
    }

    pub fn feed(&mut self, lines: u8) -> &mut Self {
        for _ in 0..lines {
            self.buffer.push(Self::LF);
        }
        self
    }

    pub fn cut(&mut self) -> &mut Self {
        self.buffer.extend_from_slice(&[Self::GS, 0x56, 0x00]);
        self
    }

    pub fn raster_image(&mut self, width_bytes: usize, height: usize, data: &[u8]) -> &mut Self {
        let wl = (width_bytes & 0xFF) as u8;
        let wh = ((width_bytes >> 8) & 0xFF) as u8;
        let hl = (height & 0xFF) as u8;
        let hh = ((height >> 8) & 0xFF) as u8;

        self.buffer.extend_from_slice(&[
            Self::GS, 0x76, 0x30, 0x00, wl, wh, hl, hh,
        ]);
        self.buffer.extend_from_slice(data);
        self
    }

    pub fn build(self) -> Vec<u8> {
        self.buffer
    }
}

/// =======================================================
/// PDF → ESC/POS PRINTER
/// =======================================================

pub struct PDFPrinter{
    app_handle: AppHandle,
}

impl PDFPrinter {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }
    pub fn print_pdf_to_escpos(
        &self,
        pdf_bytes: &[u8],
        pixel_width: usize,
    ) -> Result<Vec<u8>, String> {
        let path = self.pdfium_path()?;
        let pdfium = Pdfium::new(
            Pdfium::bind_to_library(path)
                .map_err(|e: PdfiumError| e.to_string())?,
        );

        let doc = pdfium
            .load_pdf_from_byte_slice(pdf_bytes, None)
            .map_err(|e: PdfiumError| e.to_string())?;

        let page = doc.pages().get(0).map_err(|e: PdfiumError| e.to_string())?;

        let render = page.render_with_config(
            &PdfRenderConfig::new()
                .set_target_width(pixel_width as i32)
                .render_form_data(false),
        ).map_err(|e: PdfiumError| e.to_string())?;

        let image = render.as_image();

        let mono = Self::to_monochrome(image);
        let (width_bytes, height, data) = Self::pack_bitmap(&mono);

        let mut escpos = EscPos::new();
        escpos.init();
        escpos.align(1);
        escpos.raster_image(width_bytes, height, &data);
        escpos.feed(3);
        escpos.cut();

        Ok(escpos.build())
    }

    fn to_monochrome(img: DynamicImage) -> GrayImage {
        img.to_luma8()
    }

    fn pack_bitmap(img: &GrayImage) -> (usize, usize, Vec<u8>) {
        let (w, h) = img.dimensions();
        let width_bytes = ((w + 7) / 8) as usize;
        let mut data = vec![0u8; width_bytes * h as usize];

        for y in 0..h {
            for x in 0..w {
                let pixel = img.get_pixel(x, y)[0];
                if pixel < 128 {
                    let byte_index = (y as usize * width_bytes) + (x as usize / 8);
                    data[byte_index] |= 0x80 >> (x % 8);
                }
            }
        }

        (width_bytes, h as usize, data)
    }

    fn pdfium_path(&self) -> Result<PathBuf, String> {
        let mut pdfium_path = self.app_handle.path()
            .resource_dir()
            .map_err(|e| format!("Failed to get resource dir: {}", e))?;

        #[cfg(target_os = "macos")]
        pdfium_path.push("binaries/libpdfium.dylib");

        #[cfg(target_os = "windows")]
        pdfium_path.push("binaries/pdfium.dll");

        if !pdfium_path.exists() {
            return Err(format!("PDFium not found at {:?}", pdfium_path));
        }

        Ok(pdfium_path)
    }

}


/// =======================================================
/// PRINTER MANAGER
/// =======================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterInfo {
    pub name: String,
    pub port: String,
}

pub struct PrinterManager;

impl PrinterManager {
    pub fn list_printers() -> Vec<PrinterInfo> {
        printers::get_printers()
            .into_iter()
            .map(|p| PrinterInfo {
                name: p.name.clone(),
                port: p.system_name.clone(),
            })
            .collect()
    }

    pub fn print(printer_port: &str, data: &[u8]) -> Result<String, String> {
        if let Some(printer) = printers::get_printer_by_name(printer_port) {
            printer
                .print(data, PrinterJobOptions::none())
                .map_err(|e| e.to_string())?;
            return Ok("Printed successfully".into());
        }

        if let Ok(mut port) = serialport::new(printer_port, 9600)
            .timeout(std::time::Duration::from_secs(2))
            .open()
        {
            port.write_all(data)
                .map_err(|e| e.to_string())?;
            return Ok("Printed via serial".into());
        }

        Err("Printer not found".into())
    }
}

/// =======================================================
/// TAURI COMMANDS
/// =======================================================

#[tauri::command]
pub fn get_printers() -> Result<Vec<PrinterInfo>, String> {
    Ok(PrinterManager::list_printers())
}

#[tauri::command]
pub fn print_pdf(
    app_handle: AppHandle,
    printer_port: String,
    pdf_bytes: Vec<u8>,
    paper_width: Option<usize>,
) -> Result<String, String> {
    let pixel_width = if paper_width.unwrap_or(80) < 70 {
        384
    } else {
        576
    };
    let printer = PDFPrinter::new(app_handle);
    let escpos_data = printer.print_pdf_to_escpos(&pdf_bytes, pixel_width)?;

    PrinterManager::print(&printer_port, &escpos_data)
}

#[tauri::command]
pub fn test_print(printer_port: String) -> Result<String, String> {
    let mut escpos = EscPos::new();
    escpos.init();
    escpos.align(1);
    escpos.text("HANAN VENTURES\n");
    escpos.text("System Configuration Test\n");
    escpos.text("------------------------\n");
    escpos.text("If you can read this,\n");
    escpos.text("the printer is working!\n");
    escpos.feed(3);
    escpos.cut();

    PrinterManager::print(&printer_port, &escpos.build())
}