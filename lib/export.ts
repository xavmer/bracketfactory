"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Bracket } from "@/lib/bracket/models";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportBracketJson(bracket: Bracket) {
  const blob = new Blob([JSON.stringify(bracket, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, `${bracket.name.replace(/\s+/g, "-").toLowerCase()}.json`);
}

export async function exportBracketPng(element: HTMLElement, bracket: Bracket) {
  const canvas = await html2canvas(element, {
    backgroundColor: "#f6f7fb",
    scale: 2,
    useCORS: true,
  });

  canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, `${bracket.name.replace(/\s+/g, "-").toLowerCase()}.png`);
    }
  }, "image/png");
}

export async function exportBracketPdf(element: HTMLElement, bracket: Bracket) {
  const canvas = await html2canvas(element, {
    backgroundColor: "#f6f7fb",
    scale: 2,
    useCORS: true,
  });
  const image = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(image, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`${bracket.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
