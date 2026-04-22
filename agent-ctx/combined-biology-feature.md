# Combined Biology Mode Feature - Implementation Summary

## Task
Implement a "Combined Biology" mode toggle in the NEET Test Analyzer that allows users to treat Botany + Zoology as a single "Biology" section.

## Files Modified

### 1. `src/app/analyze/page.tsx`
- Added `combinedBiology` state (default: false)
- Added `displaySubjects` computed value that shows 3 subjects (Physics, Chemistry, Biology) when combined
- Added `isDisplaySubjectSelected()` helper that checks biology selection (both botany && zoology)
- Modified `getMaxMarks()` to handle combined biology (Biology = 360 marks)
- Modified `getTotalQuestions()` to handle combined biology (Biology = 90 questions)
- Modified `toggleSubject()` to toggle both botany/zoology when biology is toggled
- Added Combined Biology Mode toggle UI (teal Leaf icon, pill toggle style matching Time Slip)
- Modified subject selection grid to use `displaySubjects` with responsive columns (3 when combined, 4 otherwise)
- Modified OMR mode sections: shows one "Biology (Q91-Q180)" section when combined instead of separate Botany+Zoology
- Modified Scanner mode sections: same merge for detected answers
- Updated description text to show "Last 90: Biology" when combined
- Added `combinedBiology` to both `overall` and `record` objects saved to localStorage
- Added `Leaf` icon import from lucide-react

### 2. `src/app/edit/[id]/page.tsx`
- Added `combinedBiology: false` to testData initial state
- Added same `displaySubjects`, `isDisplaySubjectSelected`, `getMaxMarks`, `toggleSubject` logic
- Read `combinedBiology` from existing test record when loading (`test.combinedBiology || false`)
- Added Combined Biology Mode toggle UI (same teal Leaf style)
- Modified subject selection grid to use displaySubjects
- Modified OMR sections: when combined, shows Physics/Chemistry/Biology instead of 4-subject loop
- Added `combinedBiology` to both `overall` and `record` objects
- Added `Leaf` icon import

### 3. `src/app/results/[id]/page.tsx`
- Added `BIOLOGY_SUBJECT` constant with teal color
- Added `isCombinedBiology()` helper function
- Added `getDisplaySubjects()` returning 3-subject list when combined
- Added `getSelectedSubjectsList()` using display subjects
- Added `getSubjectMarks()` combining botanyMarks + zoologyMarks for biology
- Added `getSubjectMaxMarks()` returning 360 for biology
- Added `getSubjectQuestionCount()` returning 90 for biology
- Modified "Subjects Included" card to use `getSelectedSubjectsList()`
- Modified "Subject-wise Performance" grid to use display subjects with correct marks/max
- Modified "Subject-wise Detailed Breakdown" to combine Botany+Zoology into Biology card when combined
- Modified "Detailed Question Analysis" table to show "Biology" instead of "Botany"/"Zoology" when combined
- Added `combinedBiology` to `regenerateAnalysis()` output
- Updated useEffect to check test record for `combinedBiology` when cached analysis is stale

### 4. `src/app/page.tsx`
- Added `BIOLOGY_SUBJECT` constant with shortName "Bio" and teal color
- Added `combinedBiology?: boolean` to TestRecord interface
- Modified `getSelectedSubjects()` to return 3-subject list when combined
- Modified subject marks display: when combined, shows "Bio" with teal dot and combined botany+zoology marks (max 360)
- Modified subject badges condition: shows badges when subjects < 3 (combined) or < 4 (normal)

### 5. `src/app/settings/page.tsx` (already had the changes)
- Export already includes `cb: record.combinedBiology || undefined`
- Import already includes `combinedBiology: r.cb || false`

## Key Design Decisions
- **Internal data unchanged**: selectedSubjects still stores separate botany/zoology keys; combining is display-only
- **Answer string format unchanged**: 180-char string still maps Q91-135=Botany, Q136-180=Zoology internally
- **biologyMarks = botanyMarks + zoologyMarks**: computed at display time, not stored separately
- **Max marks for Biology = 360** (90 questions × 4 marks)
- **Biology color: bg-teal-500** for dots/indicators/badges
- **Biology shortName: "Bio"** for compact displays
- Toggle uses same pill style as Time Slip toggle with teal accent color
