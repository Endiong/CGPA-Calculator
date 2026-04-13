import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { calculateOverallStats, calculateSemesterStats, getClassOfDegree } from '../utils';
import { Year, GradingScale, GradingConfig, Course } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const A4_W = 794;   // A4 width in px at 96 DPI
const A4_H = 1123;  // A4 height in px at 96 DPI
const SCALE = 2;

const C = {
    primary:   '#002e02',
    secondary: '#426920',
    surface:   '#F9FAF7',
    outline:   '#717973',
};

const F = {
    headline: `'Epilogue', system-ui, sans-serif`,
    body:     `'Manrope', system-ui, sans-serif`,
    mono:     `'Roboto Mono', monospace`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(r)));

const capture = (el: HTMLElement, bg: string) =>
    html2canvas(el, {
        scale: SCALE,
        useCORS: true,
        allowTaint: false,
        backgroundColor: bg,
        logging: false,
        width: A4_W,
        height: (el.style.height ? parseInt(el.style.height) : undefined),
        imageTimeout: 0,
    });

// ─── Course rows ─────────────────────────────────────────────────────────────

const buildRows = (courses: Course[]): string =>
    courses
        .filter(c => (Number(c.unit) || 0) > 0)
        .map((c, i) => `
          <tr style="border-bottom:1px solid rgba(0,46,2,0.06)">
            <td style="padding:5px 8px;font-family:${F.mono};font-size:9px;color:#9ca3af">${String(i + 1).padStart(2, '0')}</td>
            <td style="padding:5px 8px;font-family:${F.mono};font-size:9px;font-weight:700;color:${C.primary}">${c.code || '—'}</td>
            <td style="padding:5px 8px;font-family:${F.body};font-size:9px">${c.title || '—'}</td>
            <td style="padding:5px 8px;font-family:${F.mono};font-size:9px;text-align:center">${c.unit}</td>
            <td style="padding:5px 8px;font-family:${F.headline};font-size:10px;font-weight:900;text-align:right;color:${C.secondary}">${c.grade}</td>
          </tr>`)
        .join('');

// ─── Semester card ────────────────────────────────────────────────────────────

const buildSemCard = (name: string, gpa: string, rows: string) => `
  <div style="position:relative;background:white;border-radius:0 8px 8px 0;border:1px solid rgba(0,46,2,0.07);border-left:none;margin-bottom:10px">
    <div style="position:absolute;left:0;top:0;bottom:0;width:5px;background:${C.secondary};border-radius:5px 0 0 5px"></div>
    <div style="padding:10px 12px 10px 18px">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px">
        <h4 style="margin:0;font-family:${F.headline};font-size:13px;font-weight:900;color:${C.primary};text-transform:uppercase;letter-spacing:-0.015em">${name}</h4>
        <div style="text-align:right">
          <span style="display:block;font-family:${F.mono};font-size:7px;color:${C.outline};text-transform:uppercase;letter-spacing:0.15em;line-height:1.2">Semester GPA</span>
          <span style="font-family:${F.headline};font-size:18px;font-weight:900;color:${C.primary}">${gpa}</span>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid rgba(0,46,2,0.22)">
            <th style="padding:3px 8px;font-family:${F.mono};font-size:7px;font-weight:700;color:${C.primary};text-transform:uppercase;text-align:left;width:28px">SN</th>
            <th style="padding:3px 8px;font-family:${F.mono};font-size:7px;font-weight:700;color:${C.primary};text-transform:uppercase;text-align:left">Code</th>
            <th style="padding:3px 8px;font-family:${F.mono};font-size:7px;font-weight:700;color:${C.primary};text-transform:uppercase;text-align:left">Title</th>
            <th style="padding:3px 8px;font-family:${F.mono};font-size:7px;font-weight:700;color:${C.primary};text-transform:uppercase;text-align:center">Units</th>
            <th style="padding:3px 8px;font-family:${F.mono};font-size:7px;font-weight:700;color:${C.primary};text-transform:uppercase;text-align:right">Grade</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;

// ─── Page HTML builders ───────────────────────────────────────────────────────

const buildCoverHtml = () => `
  <div style="
    width:${A4_W}px;height:${A4_H}px;
    background:${C.surface};
    position:relative;overflow:hidden;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:0 80px;
    box-sizing:border-box;
  ">

    <!-- Blueprint horizontal lines -->
    <div style="position:absolute;left:0;right:0;top:25%;height:1px;background:rgba(0,46,2,0.08)"></div>
    <div style="position:absolute;left:0;right:0;bottom:25%;height:1px;background:rgba(0,46,2,0.08)"></div>
    <!-- Blueprint vertical lines -->
    <div style="position:absolute;top:0;bottom:0;left:33.33%;width:1px;background:rgba(0,46,2,0.08)"></div>
    <div style="position:absolute;top:0;bottom:0;right:33.33%;width:1px;background:rgba(0,46,2,0.08)"></div>

    <!-- Nodes at intersections -->
    <div style="position:absolute;width:6px;height:6px;background:${C.primary};border-radius:50%;top:25%;left:33.33%;transform:translate(-50%,-50%)"></div>
    <div style="position:absolute;width:6px;height:6px;background:${C.primary};border-radius:50%;top:25%;right:33.33%;transform:translate(50%,-50%)"></div>
    <div style="position:absolute;width:6px;height:6px;background:${C.primary};border-radius:50%;bottom:25%;left:33.33%;transform:translate(-50%,50%)"></div>
    <div style="position:absolute;width:6px;height:6px;background:${C.primary};border-radius:50%;bottom:25%;right:33.33%;transform:translate(50%,50%)"></div>

    <!-- Decorative 2D rectangles (no 3D transform — html2canvas safe) -->
    <div style="position:absolute;width:200px;height:200px;top:9%;left:7%;border:1.5px solid rgba(0,46,2,0.12);transform:rotate(12deg)"></div>
    <div style="position:absolute;width:140px;height:140px;bottom:10%;right:8%;border:1px solid rgba(0,46,2,0.09);transform:rotate(-8deg)"></div>
    <div style="position:absolute;width:90px;height:90px;bottom:18%;right:13%;border:1px solid rgba(0,46,2,0.06);transform:rotate(22deg)"></div>

    <!-- Data stream lines -->
    <div style="position:absolute;left:20%;top:0;width:1px;height:240px;background:linear-gradient(to bottom,transparent,rgba(66,105,32,0.32),transparent)"></div>
    <div style="position:absolute;right:25%;bottom:0;width:1px;height:190px;background:linear-gradient(to top,transparent,rgba(66,105,32,0.32),transparent)"></div>

    <!-- Centre content -->
    <div style="position:relative;z-index:1">
      <!-- Badge -->
      <div style="width:60px;height:60px;border:1px solid rgba(0,46,2,0.28);display:flex;align-items:center;justify-content:center;margin:0 auto 28px">
        <div style="width:22px;height:22px;border:2px solid rgba(0,46,2,0.42);display:flex;align-items:center;justify-content:center">
          <div style="width:7px;height:7px;background:rgba(0,46,2,0.68)"></div>
        </div>
      </div>

      <!-- Title -->
      <h1 style="margin:0;font-family:${F.headline};font-size:72px;font-weight:900;color:${C.primary};line-height:0.88;letter-spacing:-0.05em;text-transform:uppercase">SCHOLAR<br/>REPORT</h1>

      <!-- Subtitle with dividers -->
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:36px">
        <div style="height:1px;width:64px;background:rgba(0,46,2,0.2)"></div>
        <span style="font-family:${F.mono};font-weight:700;color:${C.primary};letter-spacing:0.55em;font-size:10px;text-transform:uppercase">CGPA CALCULATOR</span>
        <div style="height:1px;width:64px;background:rgba(0,46,2,0.2)"></div>
      </div>
    </div>
  </div>`;

const buildReportHtml = (
    cgpa: string,
    deg: string,
    totalUnits: number,
    scale: GradingScale,
    semContent: string,
) => `
  <div style="
    width:${A4_W}px;
    background:white;
    padding:36px 40px;
    box-sizing:border-box;
    font-family:${F.body};
  ">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:8px;border-bottom:2.5px solid ${C.primary}">
      <h2 style="margin:0;font-family:${F.headline};font-size:24px;font-weight:900;color:${C.primary};text-transform:uppercase;letter-spacing:-0.025em">Academic Report</h2>
      <div style="text-align:right">
        <p style="margin:0;font-family:${F.mono};font-size:7px;color:${C.outline};text-transform:uppercase;letter-spacing:0.18em">System</p>
        <p style="margin:0;font-family:${F.mono};font-size:9px;font-weight:700;color:${C.primary}">CGPA CALCULATOR</p>
      </div>
    </div>

    <!-- Summary card -->
    <div style="display:flex;align-items:stretch;background:#f8f9f8;border-radius:12px;border:1px solid rgba(0,46,2,0.08);overflow:hidden;margin-bottom:22px">
      <!-- CGPA block -->
      <div style="background:${C.primary};color:white;padding:18px 24px;min-width:210px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;flex-shrink:0;position:relative;overflow:hidden">
        <div style="position:absolute;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.06);right:-20px;top:-20px"></div>
        <p style="margin:0 0 4px;font-family:${F.mono};font-size:7.5px;text-transform:uppercase;letter-spacing:0.18em;opacity:0.8">Cumulative CGPA</p>
        <div style="font-family:${F.headline};font-size:44px;font-weight:900;line-height:1;letter-spacing:-0.03em">${cgpa}</div>
        <div style="margin-top:7px;display:inline-block;padding:2px 10px;background:${C.secondary};border-radius:9999px;font-family:${F.body};font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">${deg}</div>
      </div>
      <!-- Stats -->
      <div style="display:flex;flex:1;align-items:center;justify-content:space-around;padding:0 24px">
        <div style="text-align:center">
          <p style="margin:0 0 4px;font-family:${F.mono};font-size:7.5px;color:${C.outline};text-transform:uppercase;letter-spacing:0.15em">Total Credits</p>
          <div style="font-family:${F.headline};font-size:28px;font-weight:900;color:${C.primary};letter-spacing:-0.02em">${totalUnits}</div>
        </div>
        <div style="width:1px;height:30px;background:rgba(0,46,2,0.12)"></div>
        <div style="text-align:center">
          <p style="margin:0 0 4px;font-family:${F.mono};font-size:7.5px;color:${C.outline};text-transform:uppercase;letter-spacing:0.15em">Grading Scale</p>
          <div style="font-family:${F.headline};font-size:28px;font-weight:900;color:${C.primary};letter-spacing:-0.02em">${scale}.0 Point</div>
        </div>
      </div>
    </div>

    <!-- Section title -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <span style="font-family:${F.body};font-size:8px;font-weight:700;color:${C.primary};text-transform:uppercase;letter-spacing:0.2em;white-space:nowrap">Academic Performance Breakdown</span>
      <div style="height:1px;flex:1;background:rgba(0,46,2,0.1)"></div>
    </div>

    ${semContent}

    <!-- Footer -->
    <div style="margin-top:20px;padding-top:12px;border-top:1px solid rgba(0,46,2,0.08);text-align:center">
      <p style="margin:0;font-family:${F.mono};font-size:7px;font-weight:700;color:rgba(0,46,2,0.28);text-transform:uppercase;letter-spacing:0.3em">CGPA CALCULATOR — ACADEMIC REPORT</p>
    </div>
  </div>`;

// ─── Main export function ─────────────────────────────────────────────────────

export const handleExportPDF = async (
    data: Year[],
    scale: GradingScale,
    gradingConfig: GradingConfig,
    onStart?: () => void,
    onDone?: () => void,
) => {
    const fd = data
        .map(y => ({ ...y, semesters: y.semesters.filter(s => s.courses.some(c => (Number(c.unit) || 0) > 0)) }))
        .filter(y => y.semesters.length > 0 && !y.isExcluded);

    if (fd.length === 0) {
        alert('No data to export. Add courses with units first.');
        return;
    }

    onStart?.();
    await document.fonts.ready;

    const ov  = calculateOverallStats(data, scale, gradingConfig);
    const deg = getClassOfDegree(ov.cgpa, scale);

    // Build semester section HTML
    const semContent = fd.map(year => {
        const cards = year.semesters.map(sem => {
            const ss = calculateSemesterStats(sem.courses, scale, gradingConfig);
            return buildSemCard(sem.name, ss.gpa.toFixed(2), buildRows(sem.courses));
        }).join('');
        return `
          <div style="margin-bottom:18px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
              <h3 style="margin:0;font-family:${F.headline};font-size:14px;font-weight:900;color:${C.primary};text-transform:uppercase;letter-spacing:-0.01em">${year.name}</h3>
              <div style="height:1px;flex:1;background:rgba(0,46,2,0.1)"></div>
            </div>
            ${cards}
          </div>`;
    }).join('');

    // ── Hidden render host ────────────────────────────────────────────────────
    // IMPORTANT: Render near the top-left of viewport so the browser fully
    // paints it. We use opacity:0.002 (nearly invisible) not display:none
    // or visibility:hidden — those prevent html2canvas from capturing pixels.
    const host = document.createElement('div');
    host.style.cssText = [
        'position:fixed',
        'top:0',
        'left:0',
        `width:${A4_W}px`,
        'opacity:0.002',         // nearly invisible — still painted by browser
        'pointer-events:none',
        'z-index:99999',         // on top; covered by the loading overlay below
        'overflow:visible',
    ].join(';');
    document.body.appendChild(host);

    try {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        // ── Cover page (fixed height = exactly A4) ────────────────────────────
        host.innerHTML = buildCoverHtml();
        host.firstElementChild && ((host.firstElementChild as HTMLElement).style.overflow = 'hidden');
        await nextFrame();

        const coverCanvas = await capture(host.firstElementChild as HTMLElement, C.surface);
        pdf.addImage(coverCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);

        // ── Report page(s) (variable height: auto-split into A4 slices) ───────
        host.innerHTML = buildReportHtml(ov.cgpa.toFixed(2), deg, ov.grandTotalUnits, scale, semContent);
        await nextFrame();

        const reportCanvas = await capture(host.firstElementChild as HTMLElement, '#ffffff');

        const sliceH  = A4_H * SCALE;
        const numPages = Math.ceil(reportCanvas.height / sliceH);
        const slice    = document.createElement('canvas');
        slice.width    = reportCanvas.width;
        slice.height   = sliceH;
        const ctx      = slice.getContext('2d')!;

        for (let p = 0; p < numPages; p++) {
            pdf.addPage();
            ctx.clearRect(0, 0, slice.width, slice.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, slice.width, slice.height);
            ctx.drawImage(reportCanvas, 0, -p * sliceH);
            pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
        }

        pdf.save('CGPA Report.pdf');

    } finally {
        document.body.removeChild(host);
        onDone?.();
    }
};
