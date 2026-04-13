import { calculateOverallStats, calculateSemesterStats, getClassOfDegree } from '../utils';
import { Year, GradingScale, GradingConfig, Course } from '../types';

// ─── Build course rows ────────────────────────────────────────────────────────

const buildRows = (courses: Course[]): string =>
    courses
        .filter(c => (Number(c.unit) || 0) > 0)
        .map((c, i) => `
            <tr>
                <td class="td-sn">${String(i + 1).padStart(2, '0')}</td>
                <td class="td-code">${c.code || '—'}</td>
                <td>${c.title || '—'}</td>
                <td class="td-unit">${c.unit}</td>
                <td class="td-grade">${c.grade}</td>
            </tr>`)
        .join('');

// ─── Main ─────────────────────────────────────────────────────────────────────

export const handleExportPDF = (
    data: Year[],
    scale: GradingScale,
    gradingConfig: GradingConfig,
    _onStart?: () => void,
    _onDone?: () => void,
) => {
    const fd = data
        .map(y => ({ ...y, semesters: y.semesters.filter(s => s.courses.some(c => (Number(c.unit) || 0) > 0)) }))
        .filter(y => y.semesters.length > 0 && !y.isExcluded);

    if (fd.length === 0) {
        alert('No data to export! Add courses with units first.');
        return;
    }

    const ov  = calculateOverallStats(data, scale, gradingConfig);
    const deg = getClassOfDegree(ov.cgpa, scale);

    let exportCount = parseInt(localStorage.getItem('cgpa_pdf_count') || '0', 10) + 1;
    localStorage.setItem('cgpa_pdf_count', exportCount.toString());
    const filename = exportCount > 1 ? `CGPA_Report_${exportCount}` : 'CGPA_Report';

    // ── Semester blocks HTML ──────────────────────────────────────────────────
    const semesterBlocksHtml = fd.map(year => {
        const semsHtml = year.semesters.map(sem => {
            const ss = calculateSemesterStats(sem.courses, scale, gradingConfig);
            return `
                <div class="sem-card">
                    <div class="sem-accent"></div>
                    <div class="sem-inner">
                        <div class="sem-head">
                            <h4 class="sem-name">${sem.name}</h4>
                            <div style="text-align:right">
                                <span class="sem-gpa-label">Semester GPA</span>
                                <span class="sem-gpa-value">${ss.gpa.toFixed(2)}</span>
                            </div>
                        </div>
                        <table class="courses">
                            <thead>
                                <tr>
                                    <th style="width:32px">SN</th>
                                    <th>Code</th><th>Title</th>
                                    <th style="text-align:center">Units</th>
                                    <th style="text-align:right">Grade</th>
                                </tr>
                            </thead>
                            <tbody>${buildRows(sem.courses)}</tbody>
                        </table>
                    </div>
                </div>`;
        }).join('');

        return `
            <div class="year-block">
                <div class="year-header">
                    <h3 class="year-name">${year.name}</h3>
                    <div class="year-hr"></div>
                </div>
                ${semsHtml}
            </div>`;
    }).join('');

    // ── Full HTML document ────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${filename}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@400;700;900&family=Manrope:wght@400;600;700&family=Roboto+Mono:wght@700&display=swap');
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;padding:0;background:#94a3b8;font-family:'Manrope',system-ui,sans-serif;color:#111827}
@page{size:A4;margin:0}
@media print{body{background:white}.page-break{page-break-after:always}}

/* ── Cover ── */
.cover{
  background:#F9FAF7;width:210mm;min-height:297mm;position:relative;
  display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;
  padding:140px 80px;overflow:hidden;
}
.geo-line{position:absolute;background:rgba(46,125,50,.15)}
.geo-node{position:absolute;width:6px;height:6px;background:#2E7D32;border-radius:50%}
.data-line{position:absolute;width:1px;background:linear-gradient(to bottom,transparent,rgba(46,125,50,.35),transparent)}
.cover-title{font-family:'Epilogue',system-ui,sans-serif;font-size:72px;font-weight:900;color:#2E7D32;line-height:.9;letter-spacing:-.05em;text-transform:uppercase;margin:0}
.cover-sub{font-weight:700;color:#2E7D32;letter-spacing:.5em;font-size:11px;text-transform:uppercase}
.badge{width:64px;height:64px;border:1px solid rgba(46,125,50,.3);display:flex;align-items:center;justify-content:center;margin-bottom:24px}
.badge-inner{width:24px;height:24px;border:2px solid rgba(46,125,50,.5);display:flex;align-items:center;justify-content:center}
.badge-core{width:8px;height:8px;background:rgba(46,125,50,.8)}
.divider{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:32px}
.div-line{height:1px;width:64px;background:rgba(46,125,50,.3)}

/* ── Report ── */
.report{
  background:white;width:210mm;min-height:297mm;padding:36px 40px;
  display:flex;flex-direction:column;
}
.rpt-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;border-bottom:2.5px solid #111827;padding-bottom:8px}
.rpt-title{font-family:'Epilogue',system-ui,sans-serif;font-size:26px;font-weight:900;color:#111827;text-transform:uppercase;letter-spacing:-.025em;margin:0}

/* Summary card */
.summary{
  background:#f9fafb;border-radius:14px;
  border:1px solid rgba(17,24,39,.08);
  display:flex;align-items:stretch;gap:0;
  margin-bottom:24px;overflow:hidden;
}
.sum-cgpa{
  background:#2E7D32;color:white;
  padding:18px 24px;min-width:200px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  position:relative;overflow:hidden;flex-shrink:0;
}
.sum-cgpa::after{content:'';position:absolute;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.07);right:-20px;top:-20px}
.sum-cgpa-label{font-size:8px;text-transform:uppercase;letter-spacing:.2em;opacity:.85;margin:0 0 4px;font-family:'Roboto Mono',monospace}
.sum-cgpa-val{font-size:44px;font-weight:900;font-family:'Epilogue',system-ui,sans-serif;line-height:1;letter-spacing:-.03em}
.sum-cgpa-class{display:inline-block;margin-top:6px;padding:2px 10px;background:rgba(0,0,0,.18);border-radius:9999px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.sum-stats{display:flex;flex:1;align-items:center;justify-content:space-around;padding:16px 24px;gap:0}
.stat{text-align:center}
.stat-lbl{font-size:8px;text-transform:uppercase;letter-spacing:.18em;color:#6b7280;margin:0 0 4px;font-family:'Roboto Mono',monospace}
.stat-val{font-size:28px;font-weight:900;font-family:'Epilogue',system-ui,sans-serif;color:#111827;letter-spacing:-.02em}
.stat-sub{font-size:9px;color:#9ca3af;margin:2px 0 0;font-family:'Roboto Mono',monospace}
.stat-div{width:1px;height:32px;background:rgba(17,24,39,.12);align-self:center}

/* Section title */
.sec-title{font-size:9px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.2em;margin:0 0 14px;display:flex;align-items:center;gap:12px}
.sec-line{height:1px;flex:1;background:rgba(17,24,39,.1)}

/* Year + Sem */
.year-block{margin-bottom:22px}
.year-header{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.year-name{font-family:'Epilogue',system-ui,sans-serif;font-size:15px;font-weight:900;color:#002e02;text-transform:uppercase;letter-spacing:-.01em;margin:0}
.year-hr{height:1px;flex:1;background:rgba(0,46,2,.1)}
.sem-card{position:relative;background:white;border-radius:0 8px 8px 0;border:1px solid rgba(0,46,2,.07);border-left:none;margin-bottom:10px}
.sem-accent{position:absolute;left:0;top:0;bottom:0;width:5px;background:#426920;border-radius:5px 0 0 5px}
.sem-inner{padding:10px 12px 10px 18px}
.sem-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:7px}
.sem-name{font-family:'Epilogue',system-ui,sans-serif;font-weight:900;color:#002e02;text-transform:uppercase;letter-spacing:-.025em;font-size:13px;margin:0}
.sem-gpa-label{font-size:7px;color:#717973;font-family:'Roboto Mono',monospace;text-transform:uppercase;letter-spacing:.15em;display:block}
.sem-gpa-value{font-size:18px;font-weight:900;color:#002e02;font-family:'Epilogue',system-ui,sans-serif}
table.courses{width:100%;text-align:left;border-collapse:collapse}
table.courses thead tr{border-bottom:1px solid rgba(0,46,2,.25)}
table.courses th{padding:3px 8px;font-size:7.5px;font-weight:900;color:#002e02;font-family:'Roboto Mono',monospace;text-transform:uppercase}
table.courses td{padding:5px 8px;font-size:10px}
table.courses tbody tr:not(:last-child) td{border-bottom:1px solid rgba(17,24,39,.07)}
.td-sn{color:#9ca3af;font-family:'Roboto Mono',monospace}
.td-code{font-family:'Roboto Mono',monospace;font-weight:700}
.td-unit{text-align:center;font-family:'Roboto Mono',monospace}
.td-grade{text-align:right;font-weight:700;color:#426920}

/* Footer */
.rpt-footer{margin-top:auto;text-align:center;padding-top:14px;border-top:1px solid rgba(17,24,39,.08)}
.rpt-footer-txt{font-size:7px;font-family:'Roboto Mono',monospace;font-weight:700;color:rgba(17,24,39,.35);text-transform:uppercase;letter-spacing:.3em;margin:0}
</style>
</head>
<body>

<!-- Cover Page -->
<div class="cover page-break">
  <div class="geo-line" style="width:100%;height:1px;top:25%;left:0"></div>
  <div class="geo-line" style="width:100%;height:1px;bottom:25%;left:0"></div>
  <div class="geo-line" style="height:100%;width:1px;left:33.33%;top:0"></div>
  <div class="geo-line" style="height:100%;width:1px;right:33.33%;top:0"></div>
  <div class="geo-node" style="top:25%;left:33.33%;transform:translate(-50%,-50%)"></div>
  <div class="geo-node" style="top:25%;right:33.33%;transform:translate(50%,-50%)"></div>
  <div class="geo-node" style="bottom:25%;left:33.33%;transform:translate(-50%,50%)"></div>
  <div class="geo-node" style="bottom:25%;right:33.33%;transform:translate(50%,50%)"></div>
  <div class="data-line" style="height:16rem;left:20%;top:0"></div>
  <div class="data-line" style="height:12rem;right:25%;bottom:0"></div>
  <div style="position:absolute;width:200px;height:200px;top:10%;left:8%;border:2px solid rgba(46,125,50,.12);transform:rotateX(45deg) rotateZ(45deg)"></div>
  <div style="position:absolute;width:160px;height:160px;bottom:12%;right:8%;clip-path:polygon(50% 0%,0% 100%,100% 100%);background:linear-gradient(to top,rgba(46,125,50,.12),transparent)"></div>
  <div style="position:relative;z-index:10">
    <div class="badge">
      <div class="badge-inner"><div class="badge-core"></div></div>
    </div>
    <h1 class="cover-title">SCHOLAR<br/>REPORT</h1>
    <div class="divider">
      <div class="div-line"></div>
      <span class="cover-sub">CGPA CALCULATOR</span>
      <div class="div-line"></div>
    </div>
  </div>
</div>

<!-- Report Page -->
<div class="report">
  <div class="rpt-header">
    <h2 class="rpt-title">Academic Report</h2>
    <span style="font-size:8px;font-family:'Roboto Mono',monospace;color:#9ca3af;letter-spacing:.15em;text-transform:uppercase">${filename}</span>
  </div>

  <!-- Summary Card -->
  <div class="summary">
    <div class="sum-cgpa">
      <p class="sum-cgpa-label">Cumulative CGPA</p>
      <div class="sum-cgpa-val">${ov.cgpa.toFixed(2)}</div>
      <div class="sum-cgpa-class">${deg}</div>
    </div>
    <div class="sum-stats">
      <div class="stat">
        <p class="stat-lbl">Total Credits</p>
        <div class="stat-val">${ov.grandTotalUnits}</div>
        <p class="stat-sub">Credit Units</p>
      </div>
      <div class="stat-div"></div>
      <div class="stat">
        <p class="stat-lbl">Grading Scale</p>
        <div class="stat-val">${scale}.0</div>
        <p class="stat-sub">Point Scale</p>
      </div>
    </div>
  </div>

  <h3 class="sec-title">Performance Breakdown <span class="sec-line"></span></h3>

  ${semesterBlocksHtml}

  <div class="rpt-footer">
    <p class="rpt-footer-txt">CGPA CALCULATOR &mdash; ACADEMIC REPORT</p>
  </div>
</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 600);
  };
</script>
</body>
</html>`;

    // ── Inject into hidden iframe → auto-print, no popup needed ──────────────
    const iframeId = 'cgpa_pdf_frame';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (iframe) iframe.remove();

    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:9999;background:white;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { alert('Could not prepare the report. Please try again.'); return; }

    doc.open();
    doc.write(html);
    doc.close();

    // The page script inside the iframe fires window.print() after fonts load.
    // Remove the iframe once the print dialog has been dismissed.
    const cleanup = () => {
        setTimeout(() => iframe?.remove(), 800);
    };
    iframe.contentWindow?.addEventListener('afterprint', cleanup);
    // Fallback cleanup in case afterprint doesn't fire (some mobile browsers)
    setTimeout(cleanup, 30000);
};
