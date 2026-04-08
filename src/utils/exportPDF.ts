import { calculateOverallStats, calculateSemesterStats, getClassOfDegree } from '../utils';
import { Year, GradingScale, GradingConfig, Course } from '../types';

export const handleExportPDF = (data: Year[], scale: GradingScale, gradingConfig: GradingConfig) => {
    const fd = data
        .map(y => ({
            ...y,
            semesters: y.semesters.filter(s => s.courses.some(c => (Number(c.unit) || 0) > 0))
        }))
        .filter(y => y.semesters.length > 0 && !y.isExcluded);

    if (fd.length === 0) {
        alert('No data to export! Add courses with units first.');
        return;
    }

    const ov = calculateOverallStats(data, scale, gradingConfig);
    const deg = getClassOfDegree(ov.cgpa, scale);
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    let exportCount = parseInt(localStorage.getItem('cgpa_pdf_count') || '0', 10);
    exportCount += 1;
    localStorage.setItem('cgpa_pdf_count', exportCount.toString());
    const filename = exportCount > 1 ? `CGPA_Report_${exportCount}` : `CGPA_Report`;

    const buildTableRows = (courses: Course[]): string =>
        courses
            .filter(c => (Number(c.unit) || 0) > 0)
            .map((c, i) => `
              <tr>
                <td style="padding: 6px 8px; color: #717973; font-family: 'Roboto Mono', monospace; font-size: 10px;">${String(i + 1).padStart(2, '0')}</td>
                <td style="padding: 6px 8px; font-family: 'Roboto Mono', monospace; font-weight: 700; font-size: 10px;">${c.code || '—'}</td>
                <td style="padding: 6px 8px; font-size: 10px;">${c.title || '—'}</td>
                <td style="padding: 6px 8px; text-align: center; font-family: 'Roboto Mono', monospace; font-size: 10px;">${c.unit}</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #426920; font-size: 10px; font-family: 'Epilogue', sans-serif;">${c.grade}</td>
              </tr>`)
            .join('');

    const buildSemesterCards = (): string =>
        fd.map(year => {
            const semesterHtml = year.semesters.map(sem => {
                const ss = calculateSemesterStats(sem.courses, scale, gradingConfig);
                return `
                  <div style="position: relative; background: white; border-radius: 0 8px 8px 0; border: 1px solid rgba(0,46,2,0.05); border-left: none; margin-bottom: 12px; break-inside: avoid;">
                    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: #426920; border-radius: 6px 0 0 6px;"></div>
                    <div style="padding: 12px 12px 12px 20px;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
                        <h4 style="font-family: 'Epilogue', sans-serif; font-weight: 900; color: #002e02; text-transform: uppercase; letter-spacing: -0.025em; font-size: 14px; margin: 0;">${sem.name}</h4>
                        <div style="text-align: right;">
                          <span style="font-size: 7px; color: #717973; font-family: 'Roboto Mono', monospace; text-transform: uppercase; letter-spacing: 0.2em; display: block; line-height: 1;">Semester GPA</span>
                          <span style="font-size: 18px; font-weight: 900; color: #002e02; font-family: 'Epilogue', sans-serif;">${ss.gpa.toFixed(2)}</span>
                        </div>
                      </div>
                      <table style="width: 100%; text-align: left; border-collapse: collapse;">
                        <thead>
                          <tr style="border-bottom: 1px solid rgba(0,46,2,0.3);">
                            <th style="padding: 4px 8px; font-size: 8px; font-weight: 900; color: #002e02; font-family: 'Roboto Mono', monospace; text-transform: uppercase; width: 32px;">SN</th>
                            <th style="padding: 4px 8px; font-size: 8px; font-weight: 900; color: #002e02; font-family: 'Roboto Mono', monospace; text-transform: uppercase;">Code</th>
                            <th style="padding: 4px 8px; font-size: 8px; font-weight: 900; color: #002e02; font-family: 'Roboto Mono', monospace; text-transform: uppercase;">Title</th>
                            <th style="padding: 4px 8px; font-size: 8px; font-weight: 900; color: #002e02; font-family: 'Roboto Mono', monospace; text-transform: uppercase; text-align: center;">Units</th>
                            <th style="padding: 4px 8px; font-size: 8px; font-weight: 900; color: #002e02; font-family: 'Roboto Mono', monospace; text-transform: uppercase; text-align: right;">Grade</th>
                          </tr>
                        </thead>
                        <tbody style="border-collapse: collapse;">
                          ${buildTableRows(sem.courses)}
                        </tbody>
                      </table>
                    </div>
                  </div>`;
            }).join('');

            return `
              <div style="margin-bottom: 24px; page-break-inside: avoid;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <h3 style="font-family: 'Epilogue', sans-serif; font-size: 16px; font-weight: 900; color: #002e02; text-transform: uppercase; letter-spacing: 0; margin: 0;">${year.name}</h3>
                  <div style="height: 1px; flex: 1; background: rgba(0,46,2,0.1);"></div>
                </div>
                ${semesterHtml}
              </div>
            `;
        }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${filename}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;700;900&family=Manrope:wght@400;500;700&family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>
@page { size: A4; margin: 15mm; }
@media print {
  body { background: none !important; padding: 0 !important; margin: 0 !important; }
  .no-print { display: none !important; }
  .a4-page { margin: 0 !important; box-shadow: none !important; background: white !important; }
  .cover-page { page-break-after: always; overflow: hidden; background: #F9FAF7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; height: 260mm !important; }
  .report-page { height: auto !important; padding: 0 !important; }
  .fixed-footer { position: fixed; bottom: 0; left: 0; width: 100%; text-align: center; display: block; }
}
* { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
body { font-family: 'Manrope', sans-serif; background: #e5e7eb; margin: 0; padding: 20px 0; color: #111827; }
.a4-page { width: 210mm; min-height: 297mm; margin: 10px auto; background: white; box-shadow: 0 4px 24px rgba(0,0,0,0.12); position: relative; overflow: hidden; }
.cover-page { background: #F9FAF7; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40mm 30mm; position: relative; z-index: 10; height: 260mm; }
.fixed-footer { position: absolute; bottom: 12mm; left: 0; width: 100%; text-align: center; }
.report-page { padding: 10px; display: flex; flex-direction: column; }
.no-print-bar { text-align: center; margin-bottom: 16px; font-family: Manrope, sans-serif; font-size: 13px; color: #717973; padding: 8px; }
.print-btn { background: #111827; color: white; border: none; padding: 12px 24px; border-radius: 9999px; font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; margin: 0 auto 16px; }
.geo-line { position: absolute; background: rgba(46,125,50,0.15); }
.geo-node { position: absolute; width: 6px; height: 6px; background: #2E7D32; border-radius: 50%; }
.data-line { position: absolute; width: 1px; background: linear-gradient(to bottom, transparent, rgba(46,125,50,0.35), transparent); }
tbody tr:not(:last-child) td { border-bottom: 1px solid rgba(17,24,39,0.08); }
</style>
</head>
<body>

<div class="no-print">
<div class="no-print-bar">Your Scholar Report is ready. Click <strong>Save as PDF</strong> to download.</div>
<button class="print-btn" onclick="window.print()">
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
Save as PDF
</button>
</div>

<!-- COVER PAGE -->
<div class="a4-page cover-page page-break">
<!-- Grid lines -->
<div class="geo-line" style="width: 100%; height: 1px; top: 25%; left: 0;"></div>
<div class="geo-line" style="width: 100%; height: 1px; bottom: 25%; left: 0;"></div>
<div class="geo-line" style="height: 100%; width: 1px; left: 33.33%; top: 0;"></div>
<div class="geo-line" style="height: 100%; width: 1px; right: 33.33%; top: 0;"></div>
<div class="geo-node" style="top: 25%; left: 33.33%; transform: translate(-50%, -50%);"></div>
<div class="geo-node" style="top: 25%; right: 33.33%; transform: translate(50%, -50%);"></div>
<div class="geo-node" style="bottom: 25%; left: 33.33%; transform: translate(-50%, 50%);"></div>
<div class="geo-node" style="bottom: 25%; right: 33.33%; transform: translate(50%, 50%);"></div>
<div class="data-line" style="height: 16rem; left: 20%; top: 0;"></div>
<div class="data-line" style="height: 12rem; right: 25%; bottom: 0;"></div>
<!-- Wireframe shapes -->
<div style="position: absolute; width: 200px; height: 200px; top: 10%; left: 8%; border: 2px solid rgba(46,125,50,0.15); transform: rotateX(45deg) rotateZ(45deg);"></div>
<div style="position: absolute; width: 160px; height: 160px; bottom: 12%; right: 8%; clip-path: polygon(50% 0%,0% 100%,100% 100%); background: linear-gradient(to top, rgba(46,125,50,0.15), transparent);"></div>

<!-- Content -->
<div style="position: relative; z-index: 10;">
<div style="margin-bottom: 24px; display: flex; justify-content: center;">
  <div style="width: 64px; height: 64px; border: 1px solid rgba(46,125,50,0.3); display: flex; align-items: center; justify-content: center; position: relative;">
    <div style="width: 24px; height: 24px; border: 2px solid rgba(46,125,50,0.5); display: flex; align-items: center; justify-content: center;">
      <div style="width: 8px; height: 8px; background: rgba(46,125,50,0.8);"></div>
    </div>
  </div>
</div>
<h1 style="font-family: 'Epilogue', sans-serif; font-size: 72px; font-weight: 900; color: #2E7D32; line-height: 0.9; letter-spacing: -0.05em; text-transform: uppercase; margin: 0;">SCHOLAR<br/>REPORT</h1>

<div style="margin-top: 32px; display: flex; align-items: center; justify-content: center; gap: 16px;">
  <div style="height: 1px; width: 64px; background: rgba(46,125,50,0.3);"></div>
  <span style="font-family: 'Roboto Mono', monospace; font-weight: 700; color: #2E7D32; letter-spacing: 0.5em; font-size: 11px; text-transform: uppercase;">CGPA CALCULATOR</span>
  <div style="height: 1px; width: 64px; background: rgba(46,125,50,0.3);"></div>
</div>
</div>
</div>

<!-- REPORT PAGE -->
<div class="a4-page report-page">
<header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #111827; padding-bottom: 8px;">
<div>
  <h2 style="font-family: 'Epilogue', sans-serif; font-size: 24px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: -0.025em; margin: 0;">Academic Report</h2>
</div>
</header>

<!-- Summary Card -->
<section style="margin-bottom: 24px;">
<div style="background: #f9fafb; border-radius: 16px; padding: 8px; border: 1px solid rgba(17,24,39,0.1); display: flex; align-items: center; justify-content: space-between; gap: 16px;">
  <div style="background: #2E7D32; color: white; padding: 12px; border-radius: 12px; position: relative; overflow: hidden; width: 220px; text-align: center; flex-shrink: 0;">
    <div style="position: absolute; right: -16px; top: -16px; width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.1);"></div>
    <p style="font-size: 8px; font-family: 'Manrope', sans-serif; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.9; margin: 0 0 2px;">Cumulative CGPA</p>
    <div style="font-size: 36px; font-weight: 900; font-family: 'Epilogue', sans-serif; line-height: 1;">${ov.cgpa.toFixed(2)}</div>
    <div style="margin-top: 4px; display: inline-block; padding: 2px 8px; background: rgba(0,0,0,0.2); border-radius: 9999px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${deg}</div>
  </div>
  <div style="display: flex; flex: 1; justify-content: space-around; align-items: center; padding: 0 16px;">
    <div style="text-align: center;">
      <p style="font-size: 8px; color: #717973; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 2px; font-family: 'Roboto Mono', monospace;">Total Credits</p>
      <div style="font-size: 22px; font-weight: 900; color: #111827; font-family: 'Epilogue', sans-serif;">${ov.grandTotalUnits}</div>
    </div>
    <div style="width: 1px; height: 24px; background: rgba(17,24,39,0.2);"></div>
    <div style="text-align: center;">
      <p style="font-size: 8px; color: #717973; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 2px; font-family: 'Roboto Mono', monospace;">Grading Scale</p>
      <div style="font-size: 22px; font-weight: 900; color: #111827; font-family: 'Epilogue', sans-serif;">${scale} Point</div>
    </div>
  </div>
</div>
</section>

<!-- Semester Breakdown -->
<section style="flex: 1;">
<h3 style="font-size: 9px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 12px; font-family: 'Manrope', sans-serif; display: flex; align-items: center; gap: 12px;">
  Performance Breakdown <span style="height: 1px; flex: 1; background: rgba(17,24,39,0.1); display: inline-block;"></span>
</h3>
${buildSemesterCards()}
</section>

<!-- Footer is handled via fixed-footer class globally now -->

</div>

<div class="fixed-footer">
<p style="font-size: 7px; font-family: 'Roboto Mono', monospace; font-weight: 700; color: rgba(17,24,39,0.4); text-transform: uppercase; letter-spacing: 0.3em; margin: 0;">CGPA CALCULATOR &mdash; ACADEMIC REPORT</p>
</div>

</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
        alert('Could not open print window. Please allow popups for this site.');
        return;
    }
    win.document.write(html);
    win.document.close();
};
