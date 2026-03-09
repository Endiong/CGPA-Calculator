# 📊 CGPA Calculator

A modern, offline-capable CGPA and GPA calculator built with React and TypeScript. Supports both **4.0** and **5.0** grading scales with persistent local storage, PDF export, and AI-powered document scanning.

## ✨ Features

- **Dual Grading Scales** — Switch between 4.0 and 5.0 point systems
- **Multi-Year & Semester Tracking** — Organize courses across multiple academic years and semesters
- **AI Document Scanner** — Scan result sheets using your camera and auto-populate courses via Gemini AI
- **PDF Export** — Generate professionally styled Scholar Reports
- **Dark Mode** — Full light/dark theme support
- **Offline-Ready** — All data persists locally in your browser
- **Year Exclusion** — Exclude specific years from CGPA calculation
- **Table & Card Views** — Toggle between view modes for your courses

## 🛠️ Tech Stack

- **React 19** + **TypeScript**
- **Vite** — Fast dev server and build tool
- **Tailwind CSS** — Utility-first styling
- **Lucide React** — Icon library
- **jsPDF** — PDF generation
- **Google Generative AI** — AI-powered document scanning

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Installation

```bash
# Clone the repository
git clone https://github.com/Endiong/CGPA-Calculator.git
cd CGPA-Calculator

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Note:** The AI Scanner feature requires a valid [Gemini API key](https://aistudio.google.com/apikey). The calculator works fully without it — only the document scanning feature is disabled.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

The output will be in the `dist/` directory, ready for deployment to any static hosting service (Vercel, Netlify, GitHub Pages, etc.).

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
├── App.tsx              # Main application component
├── index.html           # Entry HTML file
├── index.tsx            # React entry point
├── constants.ts         # Default data and constants
├── types.ts             # TypeScript type definitions
├── utils.ts             # Utility functions (GPA calc, grading, etc.)
├── vite.config.ts       # Vite configuration
├── components/
│   ├── AIScannerModal.tsx    # AI document scanner
│   ├── ConfirmationModal.tsx # Confirmation dialogs
│   ├── CourseCard.tsx        # Card view for courses
│   ├── CourseRow.tsx         # Table row for courses
│   ├── Footer.tsx            # Bottom bar with CGPA display
│   ├── GradingInfoModal.tsx  # Grading scale reference
│   ├── Grainient.tsx         # Animated gradient background
│   ├── SemesterSection.tsx   # Semester container component
│   └── SettingsModal.tsx     # Settings panel
```

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
