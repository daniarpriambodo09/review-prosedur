// app/api/download-excel/route.ts

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json();
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Dokumen');

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]).map(key => ({
        header: key,
        key: key,
        width: 20,
      }));

      worksheet.columns = columns;

      // ✅ Auto-width dengan null-check
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        if (column.key) {
          const columnKey = column.key as string;
          const headerText = column.header ? String(column.header) : columnKey;
          maxLength = headerText.length;
          
          data.forEach((row: any) => {
            if (row[columnKey] !== undefined && row[columnKey] !== null) {
              const cellLength = String(row[columnKey]).length;
              if (cellLength > maxLength) {
                maxLength = cellLength;
              }
            }
          });
        }
        column.width = Math.min(maxLength + 2, 50);
      });

      // Bold header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' },
      };
      worksheet.getRow(1).font = { 
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      data.forEach((row: any) => {
        worksheet.addRow(row);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    // ✅ Return tanpa Content-Length (atau gunakan Opsi A/C di atas)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="dokumen-prosedur-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating Excel:', error);
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 });
  }
}