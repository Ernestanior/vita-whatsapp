// @ts-nocheck
/**
 * API endpoint for data export
 * GET /api/dashboard/export?format=csv|pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get session token from header
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Verify session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const userId = (session as { user_id: string }).user_id;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let query = supabase
      .from('food_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply date filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('Error fetching records:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch records' },
        { status: 500 }
      );
    }

    if (format === 'csv') {
      return generateCSV(records || []);
    } else if (format === 'pdf') {
      return generatePDF(records || []);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid format' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in export API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateCSV(records: any[]) {
  // CSV headers
  const headers = [
    'Date',
    'Time',
    'Meal Context',
    'Foods',
    'Calories',
    'Protein (g)',
    'Carbs (g)',
    'Fat (g)',
    'Sodium (mg)',
    'Rating',
    'Score',
  ];

  // CSV rows
  const rows = records.map((record) => {
    const recognition = record.recognition_result as any;
    const rating = record.health_rating as any;
    const date = new Date(record.created_at);

    const foods = recognition.foods
      .map((f: any) => `${f.nameLocal || f.name} (${f.portion})`)
      .join('; ');

    const nutrition = recognition.totalNutrition;
    const avgCalories = Math.round((nutrition.calories.min + nutrition.calories.max) / 2);
    const avgProtein = Math.round((nutrition.protein.min + nutrition.protein.max) / 2);
    const avgCarbs = Math.round((nutrition.carbs.min + nutrition.carbs.max) / 2);
    const avgFat = Math.round((nutrition.fat.min + nutrition.fat.max) / 2);
    const avgSodium = Math.round((nutrition.sodium.min + nutrition.sodium.max) / 2);

    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      recognition.mealContext,
      foods,
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFat,
      avgSodium,
      rating.overall.toUpperCase(),
      rating.score,
    ];
  });

  // Generate CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        // Escape cells containing commas or quotes
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ),
  ].join('\n');

  // Return CSV response
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="vita-ai-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

function generatePDF(records: any[]) {
  // Simple HTML-based PDF generation
  // In production, consider using a library like puppeteer or pdfkit
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Vita AI Health Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    h1 {
      color: #2563eb;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 10px;
    }
    .summary {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #2563eb;
      color: white;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .rating-green { color: #10b981; font-weight: bold; }
    .rating-yellow { color: #f59e0b; font-weight: bold; }
    .rating-red { color: #ef4444; font-weight: bold; }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>Vita AI Health Report</h1>
  <p>Generated on: ${new Date().toLocaleString()}</p>
  
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Meals:</strong> ${records.length}</p>
    <p><strong>Date Range:</strong> ${records.length > 0 ? `${new Date(records[records.length - 1].created_at).toLocaleDateString()} - ${new Date(records[0].created_at).toLocaleDateString()}` : 'N/A'}</p>
  </div>

  <h2>Meal History</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Meal</th>
        <th>Foods</th>
        <th>Calories</th>
        <th>Protein</th>
        <th>Rating</th>
      </tr>
    </thead>
    <tbody>
      ${records.map((record) => {
        const recognition = record.recognition_result as any;
        const rating = record.health_rating as any;
        const date = new Date(record.created_at);
        
        const foods = recognition.foods
          .map((f: any) => f.nameLocal || f.name)
          .join(', ');
        
        const nutrition = recognition.totalNutrition;
        const avgCalories = Math.round((nutrition.calories.min + nutrition.calories.max) / 2);
        const avgProtein = Math.round((nutrition.protein.min + nutrition.protein.max) / 2);
        
        const ratingClass = `rating-${rating.overall}`;
        
        return `
          <tr>
            <td>${date.toLocaleDateString()}<br/><small>${date.toLocaleTimeString()}</small></td>
            <td>${recognition.mealContext}</td>
            <td>${foods}</td>
            <td>${avgCalories} cal</td>
            <td>${avgProtein}g</td>
            <td class="${ratingClass}">${rating.overall.toUpperCase()}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Vita AI - Your Personal Health Assistant</p>
    <p>This report is for informational purposes only and should not replace professional medical advice.</p>
  </div>
</body>
</html>
  `;

  // Return HTML response (browser can print to PDF)
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `inline; filename="vita-ai-report-${new Date().toISOString().split('T')[0]}.html"`,
    },
  });
}
