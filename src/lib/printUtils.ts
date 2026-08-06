/**
 * Utilitário de Impressão de Documentos do SIGEP - ISPS
 * Permite abrir qualquer documento (Plano de Atividades, Relatório, Balancete, Ficha)
 * formatado para folha A4 com cabeçalho institucional e disparar window.print().
 */

export interface PrintDocumentOptions {
  title: string;
  subtitle?: string;
  direcao?: string;
  departamento?: string;
  headerHtml?: string;
  contentHtml: string;
  styles?: string;
  orientation?: "portrait" | "landscape";
  pageSize?: "A3" | "A4" | "A5" | "letter" | "legal";
  printType?: string;
}

export function openPrintDocumentWindow(options: PrintDocumentOptions) {
  const {
    title,
    subtitle,
    direcao = "DIRECÇÃO GERAL",
    departamento,
    headerHtml,
    contentHtml,
    styles = "",
    orientation = "landscape",
    pageSize,
    printType,
  } = options;

  // Determinação automática de papel conforme as regras do utilizador:
  // - Plano de atividade -> A3 em formato horizontal (landscape)
  // - Balanço de atividade -> A4 em formato horizontal (landscape)
  let resolvedPageSize = pageSize;
  if (!resolvedPageSize) {
    const titleLower = (title + " " + (subtitle || "")).toLowerCase();
    if (titleLower.includes("balanço") || titleLower.includes("balanco") || titleLower.includes("balancete")) {
      resolvedPageSize = "A4";
    } else if (titleLower.includes("plano")) {
      resolvedPageSize = "A3";
    } else {
      resolvedPageSize = "A4";
    }
  }

  
  const printWindow = window.open(
    "",
    "_blank",
    "width=1200,height=900,scrollbars=yes,resizable=yes",
  );


  // Detecta se o conteúdo impresso já contém cabeçalho institucional oficial para evitar duplicação
  const hasEmbeddedHeader =
    contentHtml.includes("REPÚBLICA DE MOÇAMBIQUE") ||
    contentHtml.includes("República de Moçambique") ||
    contentHtml.includes("INSTITUTO SUPERIOR POLITÉCNICO") ||
    contentHtml.includes("Instituto Superior Politécnico") ||
    contentHtml.includes(
      "lh3.googleusercontent.com/d/11zvvpOpZARM1yk_irEDpjJ-qBKlTlhad",
    );

  const defaultHeader =
    headerHtml !== undefined
      ? headerHtml
      : hasEmbeddedHeader
        ? ""
        : `
    <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 6px;">
        <img src="https://lh3.googleusercontent.com/d/11zvvpOpZARM1yk_irEDpjJ-qBKlTlhad" alt="Logo ISPS" style="height: 55px; object-fit: contain;" />
      </div>
      <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 3px 0 0 0; color: #0f172a; font-family: serif;">
        INSTITUTO SUPERIOR POLITÉCNICO DE SONGO
      </h2>
      <h3 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 2px 0 0 0; color: #334155; font-family: sans-serif;">
        PROVÍNCIA DE TETE
      </h3>
      <h3 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 2px 0 0 0; color: #334155; font-family: sans-serif;">
        DISTRITO DE CAHORA-BASSA
      </h3>
      <h4 style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 4px 0 0 0; color: #1e3a8a; font-family: sans-serif;">
        ${direcao}
      </h4>
      <p style="font-size: 13px; font-weight: 900; text-transform: uppercase; margin: 8px 0 0 0; color: #0f172a; font-family: sans-serif; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 6px 0;">
        ${departamento ? `PLANO DE ATIVIDADE DO ${departamento}` : title}
      </p>
      ${subtitle ? `<p style="font-size: 11px; margin: 4px 0 0 0; color: #64748b; font-style: italic; font-family: sans-serif;">${subtitle}</p>` : ""}
    </div>
  `;

  const pageMargin = orientation === "landscape" ? "5mm" : "10mm";

  const docHtml = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <title>${title} - ISPS SIGEP</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @page {
          size: ${resolvedPageSize} ${orientation};
          margin: ${pageMargin};
        }
        @media print {
          html, body {
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            transform: scale(0.75);
            transform-origin: top left;
            width: 133% !important;
            zoom: 0.65;
            
            
            print-color-adjust: exact !important;
            zoom: 0.65;
            
            
          }
          .no-print {
            display: none !important;
          }
          .a4-container {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          div, section, article, table, tbody, tr, td, th {
            overflow: visible !important;
            max-height: none !important;
          }
          table {
            page-break-inside: auto;
            width: 100% !important;
            max-width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th, td {
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            white-space: normal !important;
            font-size: 8px !important;
            padding: 3px 4px !important;
            line-height: 1.15 !important;
          }
          .whitespace-nowrap {
            white-space: normal !important;
          }
          [class*="min-w-"], .min-w-\[1900px\], .min-w-\[1200px\] {
            min-width: 0 !important;
            width: 100% !important;
          }
          .print-page-break {
            page-break-after: always;
            break-after: page;
          }
        }
        body {
          font-family: 'Times New Roman', Times, serif, system-ui, sans-serif;
          background-color: #f1f5f9;
          margin: 0;
          padding: 16px;
          color: #0f172a;
        }
        .a4-container {
          background: white;
          width: 100%;
          min-height: 210mm;
          margin: 0 auto;
          padding: 8mm;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12);
          box-sizing: border-box;
          border-radius: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
          margin-top: 8px;
        }
        th, td {
          border: 1px solid #64748b;
          padding: 4px 5px;
          text-align: left;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        th {
          background-color: #f8fafc;
          font-weight: bold;
          color: #0f172a;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        ${styles}
      </style>
    </head>
    <body>
      <div class="no-print" style="position: sticky; top: 0; background: #0f172a; color: white; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-radius: 12px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 20px;">📄</span>
          <div>
            <h3 style="margin: 0; font-size: 14px; font-weight: bold; color: white;">${title}</h3>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">Documento Oficial ISPS (${resolvedPageSize} ${orientation.toUpperCase()})</p>
          </div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; box-shadow: 0 2px 6px rgba(37,99,235,0.4);">
            🖨️ Imprimir / Guardar PDF
          </button>
          <button onclick="window.close()" style="background: #475569; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">
            Fechar
          </button>
        </div>
      </div>

      <div class="a4-container" ${printType ? `data-print-type="${printType}"` : ""}>
        ${defaultHeader}
        ${contentHtml}
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `;

  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(docHtml);
    printWindow.document.close();
    printWindow.focus();
  } else {
    window.print();
  }
}

export function printElementById(
  elementId: string,
  title: string = "Documento ISPS",
  orientation: "portrait" | "landscape" = "landscape",
  pageSize?: "A3" | "A4" | "A5",
) {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }
  openPrintDocumentWindow({
    title,
    contentHtml: el.innerHTML,
    orientation,
    pageSize,
    printType: el.getAttribute("data-print-type") || undefined,
  });
}
