export const exportToCsv = (filename, headers, rows) => {
  if (!Array.isArray(headers) || !Array.isArray(rows)) return;

  const headerLine = headers.map((header) => header.label).join(';');
  const dataLines = rows.map((row) =>
    headers
      .map((header) => {
        const raw = row[header.key];
        const value = raw === null || raw === undefined ? '' : String(raw);
        const sanitized = value.replace(/"/g, '""');
        return `"${sanitized}"`;
      })
      .join(';')
  );

  const csvContent = [headerLine, ...dataLines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
