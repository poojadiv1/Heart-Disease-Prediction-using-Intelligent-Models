function escapePdfText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdfLines(result) {
  const lines = [
    "Heart Disease Prediction Report",
    "",
    `Prediction: ${result.prediction}`,
    `Binary Class: ${result.binaryPrediction}`,
    `Confidence: ${result.confidence}%`,
    `Risk Band: ${result.riskBand}`,
    "",
    "Top Risk Factors:"
  ];

  result.featureImportance.slice(0, 5).forEach((item) => {
    lines.push(`- ${item.feature}: ${item.score}`);
  });

  lines.push("", "Model Comparison:");
  result.modelComparison.forEach((item) => {
    lines.push(`- ${item.model}: ${item.probability}% probability | ${item.accuracy}% accuracy`);
  });

  lines.push("", "Clinical Explanation:");
  lines.push(result.explanation);
  lines.push("", "Patient Inputs:");

  Object.entries(result.input).forEach(([key, value]) => {
    lines.push(`- ${key}: ${value}`);
  });

  return lines;
}

function generatePdfReport(result) {
  const lines = buildPdfLines(result);
  const startY = 780;
  const step = 18;
  const textCommands = ["BT", "/F1 16 Tf", `72 ${startY} Td`];

  lines.forEach((line, index) => {
    if (index === 0) {
      textCommands.push(`(${escapePdfText(line)}) Tj`);
      textCommands.push("/F1 11 Tf");
    } else {
      textCommands.push(`0 -${step} Td`);
      textCommands.push(`(${escapePdfText(line)}) Tj`);
    }
  });

  textCommands.push("ET");
  const stream = textCommands.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

module.exports = {
  generatePdfReport
};
