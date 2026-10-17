use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    io::Write,
    sync::{Arc, Mutex, OnceLock},
    time::Duration,
};

use printers::common::base::job::PrinterJobOptions;

use image::{DynamicImage, GrayImage};
use pdfium_render::prelude::*;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

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

        self.buffer
            .extend_from_slice(&[Self::GS, 0x76, 0x30, 0x00, wl, wh, hl, hh]);
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

pub struct PDFPrinter {
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
        let pdfium =
            Pdfium::new(Pdfium::bind_to_library(path).map_err(|e: PdfiumError| e.to_string())?);

        let doc = pdfium
            .load_pdf_from_byte_slice(pdf_bytes, None)
            .map_err(|e: PdfiumError| e.to_string())?;

        let page = doc.pages().get(0).map_err(|e: PdfiumError| e.to_string())?;

        let render = page
            .render_with_config(
                &PdfRenderConfig::new()
                    .set_target_width(pixel_width as i32)
                    .render_form_data(false),
            )
            .map_err(|e: PdfiumError| e.to_string())?;

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
        let mut pdfium_path = self
            .app_handle
            .path()
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

static PRINTER_LOCKS: OnceLock<Mutex<HashMap<String, Arc<Mutex<()>>>>> = OnceLock::new();

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PrintTransport {
    Spooler,
    Serial,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SerialPrintConfig {
    pub baud_rate: Option<u32>,
    pub timeout_ms: Option<u64>,
    pub chunk_size: Option<usize>,
    pub chunk_delay_ms: Option<u64>,
    pub parity: Option<String>,
    pub stop_bits: Option<u8>,
    pub data_bits: Option<u8>,
    pub flow_control: Option<String>,
}

impl PrinterManager {
    fn lock_for(printer_port: &str) -> Result<Arc<Mutex<()>>, String> {
        let map = PRINTER_LOCKS.get_or_init(|| Mutex::new(HashMap::new()));
        let mut guard = map
            .lock()
            .map_err(|_| "Failed to acquire print lock registry".to_string())?;
        Ok(guard
            .entry(printer_port.to_string())
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone())
    }

    pub fn list_printers() -> Vec<PrinterInfo> {
        printers::get_printers()
            .into_iter()
            .map(|p| PrinterInfo {
                name: p.name.clone(),
                port: p.system_name.clone(),
            })
            .collect()
    }

    pub fn print(
        printer_port: &str,
        data: &[u8],
        transport: Option<PrintTransport>,
        serial_config: Option<SerialPrintConfig>,
        job_id: &str,
    ) -> Result<String, String> {
        let lock = Self::lock_for(printer_port)?;
        let _guard = lock
            .lock()
            .map_err(|_| format!("[print:{job_id}] Failed to acquire printer lock"))?;

        let route = transport.unwrap_or(PrintTransport::Spooler);
        println!(
            "[print:{job_id}] start route={:?} printer_port={} bytes={}",
            route,
            printer_port,
            data.len()
        );

        let result = match route {
            PrintTransport::Spooler => Self::print_via_spooler(printer_port, data),
            PrintTransport::Serial => Self::print_via_serial(printer_port, data, serial_config),
        };

        match &result {
            Ok(message) => println!("[print:{job_id}] success {}", message),
            Err(error) => eprintln!("[print:{job_id}] failed {}", error),
        }

        result
    }

    fn print_via_spooler(printer_port: &str, data: &[u8]) -> Result<String, String> {
        if let Some(printer) = printers::get_printer_by_name(printer_port) {
            printer
                .print(data, PrinterJobOptions::none())
                .map_err(|e| e.to_string())?;
            return Ok("Printed successfully".into());
        }

        let known = Self::list_printers()
            .into_iter()
            .map(|p| p.port)
            .collect::<Vec<_>>()
            .join(", ");
        Err(format!(
            "Printer not found for spooler route: {}. Available ports: [{}]",
            printer_port, known
        ))
    }

    fn print_via_serial(
        printer_port: &str,
        data: &[u8],
        config: Option<SerialPrintConfig>,
    ) -> Result<String, String> {
        let cfg = config.unwrap_or(SerialPrintConfig {
            baud_rate: Some(9600),
            timeout_ms: Some(2000),
            chunk_size: Some(1024),
            chunk_delay_ms: Some(5),
            parity: Some("none".to_string()),
            stop_bits: Some(1),
            data_bits: Some(8),
            flow_control: Some("none".to_string()),
        });

        let baud_rate = cfg.baud_rate.unwrap_or(9600);
        let timeout_ms = cfg.timeout_ms.unwrap_or(2000);
        let chunk_size = cfg.chunk_size.unwrap_or(1024).max(1);
        let chunk_delay_ms = cfg.chunk_delay_ms.unwrap_or(5);

        let mut port = serialport::new(printer_port, baud_rate)
            .timeout(Duration::from_millis(timeout_ms))
            .parity(Self::parse_parity(cfg.parity.as_deref())?)
            .stop_bits(Self::parse_stop_bits(cfg.stop_bits)?)
            .data_bits(Self::parse_data_bits(cfg.data_bits)?)
            .flow_control(Self::parse_flow_control(cfg.flow_control.as_deref())?)
            .open()
            .map_err(|e| format!("Failed opening serial printer {}: {}", printer_port, e))?;

        for chunk in data.chunks(chunk_size) {
            port.write_all(chunk)
                .map_err(|e| format!("Serial write failed: {}", e))?;
            port.flush()
                .map_err(|e| format!("Serial flush failed: {}", e))?;

            if chunk_delay_ms > 0 {
                std::thread::sleep(Duration::from_millis(chunk_delay_ms));
            }
        }

        Ok(format!(
            "Printed via serial (baud={}, chunk_size={}, delay_ms={})",
            baud_rate, chunk_size, chunk_delay_ms
        ))
    }

    fn parse_parity(value: Option<&str>) -> Result<serialport::Parity, String> {
        match value.unwrap_or("none").to_lowercase().as_str() {
            "none" => Ok(serialport::Parity::None),
            "odd" => Ok(serialport::Parity::Odd),
            "even" => Ok(serialport::Parity::Even),
            other => Err(format!("Unsupported serial parity: {}", other)),
        }
    }

    fn parse_stop_bits(value: Option<u8>) -> Result<serialport::StopBits, String> {
        match value.unwrap_or(1) {
            1 => Ok(serialport::StopBits::One),
            2 => Ok(serialport::StopBits::Two),
            other => Err(format!("Unsupported serial stop bits: {}", other)),
        }
    }

    fn parse_data_bits(value: Option<u8>) -> Result<serialport::DataBits, String> {
        match value.unwrap_or(8) {
            5 => Ok(serialport::DataBits::Five),
            6 => Ok(serialport::DataBits::Six),
            7 => Ok(serialport::DataBits::Seven),
            8 => Ok(serialport::DataBits::Eight),
            other => Err(format!("Unsupported serial data bits: {}", other)),
        }
    }

    fn parse_flow_control(value: Option<&str>) -> Result<serialport::FlowControl, String> {
        match value.unwrap_or("none").to_lowercase().as_str() {
            "none" => Ok(serialport::FlowControl::None),
            "software" | "xonxoff" => Ok(serialport::FlowControl::Software),
            "hardware" | "rtscts" => Ok(serialport::FlowControl::Hardware),
            other => Err(format!("Unsupported serial flow control: {}", other)),
        }
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
    transport: Option<PrintTransport>,
    serial_config: Option<SerialPrintConfig>,
) -> Result<String, String> {
    let job_id = Uuid::new_v4().to_string();
    let pixel_width = if paper_width.unwrap_or(80) < 70 {
        384
    } else {
        576
    };
    let printer = PDFPrinter::new(app_handle);
    let escpos_data = printer.print_pdf_to_escpos(&pdf_bytes, pixel_width)?;

    PrinterManager::print(
        &printer_port,
        &escpos_data,
        transport,
        serial_config,
        &job_id,
    )
}

#[tauri::command]
pub fn test_print(
    printer_port: String,
    transport: Option<PrintTransport>,
    serial_config: Option<SerialPrintConfig>,
) -> Result<String, String> {
    let job_id = Uuid::new_v4().to_string();
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

    PrinterManager::print(
        &printer_port,
        &escpos.build(),
        transport,
        serial_config,
        &job_id,
    )
}
