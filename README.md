# NEET Test Analyzer

A comprehensive NEET test analysis tool with detailed performance tracking across Physics, Chemistry, Botany, and Zoology.

## Features

- **Test Analysis**: Analyze your NEET test performance with detailed breakdowns
- **NEET Scoring**: Accurate scoring system (+4 for correct, -1 for wrong, 0 for unmarked)
- **Subject-wise Performance**: Track your performance across all 4 subjects (45 questions each)
- **Detailed Question Analysis**: View question-by-question breakdown with your answers and correct answers
- **Overall Statistics**: Comprehensive statistics including correct, wrong, and unmarked questions
- **Local Storage**: All test data is stored locally in your browser
- **Export/Import**: Backup and restore your test data
- **Dark/Light Mode**: Beautiful theme support
- **Responsive Design**: Works perfectly on mobile and desktop

## Technology Stack

- **Next.js 16** - React framework with App Router
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible components
- **Lucide React** - Beautiful icon library
- **Framer Motion** - Smooth animations
- **Next Themes** - Theme management

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/neet_test_analyser.git
cd neet_test_analyser

# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Start production server
bun start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## How to Use

### Analyzing a Test

1. Click the "New Test" button
2. Enter a test name
3. Enter your marked answers (180 digits: 0 = unmarked, 1-4 = option selected)
4. Enter the correct answers (180 digits: 1-4 = correct option)
5. Click "Analyze" to view your results

### Understanding the Results

- **Quick Overview**: Shows total correct, wrong, unmarked, marks, and percentage
- **Subject-wise Performance**: Cards showing marks for each subject out of 180
- **Subject-wise Breakdown**: Detailed breakdown for each subject showing marked, wrong, and unmarked questions
- **Question Analysis**: Complete table of all 180 questions with your answer, correct answer, status, and marks
- **Overall Performance**: Summary statistics

### Managing Tests

- View all your tests on the home page
- Click on any test to see detailed results
- Delete tests using the delete button on each test card

### Settings

- **Export Data**: Download all your test data as a JSON file
- **Import Data**: Restore your test data from a JSON backup
- **Clear All Data**: Remove all test data from local storage
- **Theme**: Switch between light, dark, and system theme

## Scoring System

NEET uses the following marking scheme:
- **Correct Answer**: +4 marks
- **Wrong Answer**: -1 mark  
- **Unmarked**: 0 marks

Total Questions: 180
- Physics: Questions 1-45
- Chemistry: Questions 46-90
- Botany: Questions 91-135
- Zoology: Questions 136-180

Maximum Marks: 720

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home page with test history
│   ├── analyze/
│   │   └── page.tsx          # Test input page
│   ├── results/
│   │   └── [id]/
│   │       └── page.tsx      # Results page
│   ├── settings/
│   │   └── page.tsx          # Settings page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── disable-context-menu.tsx
│   ├── theme-provider.tsx
│   └── ui/                   # shadcn/ui components
├── hooks/
│   ├── use-mobile.ts
│   └── use-toast.ts
└── lib/
    ├── db.ts
    └── utils.ts
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.
