# App Store Screenshot Capture Guide

## 🎯 Goal: Create 5 Perfect Screenshots for App Store

**Required Sizes:** 6.7" (iPhone 14 Pro Max), 6.5" (iPhone 14 Plus), 5.5" (iPhone 8 Plus)  
**Format:** PNG, RGB, no transparency  
**Orientation:** Portrait only

---

## 📱 Screenshot Sequence & Setup

### Screenshot 1: Workshop Hero Screen
**Message**: "Your voice, reimagined"

**Setup Steps:**
1. Open Archie app on TestFlight
2. Navigate to Workshop (home) tab
3. Ensure you're logged in with a clean account
4. Wait for pulsing orb animation to be visible
5. **Capture moment when orb is bright/pulsing**

**Text Overlay to Add Later:**
- Top: "Your voice, reimagined"
- Bottom: "AI-powered transformation starts here"

---

### Screenshot 2: Voice Recording State
**Message**: "Speak your thoughts freely"

**Setup Steps:**
1. From Workshop screen, tap the orb to start recording
2. Wait for recording state to be active (red recording indicator)
3. Speak a few words to show waveform activity
4. **Capture during active recording state**

**Text Overlay to Add Later:**
- Top: "Speak your thoughts freely"
- Bottom: "Advanced AI transcribes with precision"

---

### Screenshot 3: Reframing in Action
**Message**: "Watch limiting words become empowering"

**Setup Steps:**
1. Complete a voice recording session
2. Navigate to the reframe screen
3. Ensure there's visible before/after text
4. Highlight a word transformation (e.g., "can't" → "choose not to")
5. **Capture the reframing interface with transformations visible**

**Text Overlay to Add Later:**
- Top: "Watch limiting words become empowering"
- Bottom: "Your personal lexicon guides the transformation"

---

### Screenshot 4: Progress Dashboard
**Message**: "Track your transformation journey"

**Setup Steps:**
1. Navigate to Dashboard tab
2. Ensure there's data visible (day streak, session count, etc.)
3. Show the weekly chart with data points
4. **Capture dashboard with meaningful metrics**

**Text Overlay to Add Later:**
- Top: "Track your transformation journey"
- Bottom: "Beautiful insights into your growth"

---

### Screenshot 5: Lexicon Management
**Message**: "Build your personal vocabulary of possibility"

**Setup Steps:**
1. Navigate to Lexicon tab
2. Ensure several word pairs are visible
3. Show stats like "Total Transformations" and usage frequency
4. **Capture lexicon with populated word pairs**

**Text Overlay to Add Later:**
- Top: "Build your personal vocabulary of possibility"
- Bottom: "Customize your language transformation"

---

## 📐 Technical Requirements

### iPhone Capture Settings
- **6.7" (2796 x 1290)**: iPhone 14 Pro Max, 15 Pro Max
- **6.5" (2688 x 1242)**: iPhone 14 Plus, 15 Plus  
- **5.5" (2208 x 1242)**: iPhone 8 Plus (still required)

### iOS Screenshot Process
1. **Method 1 - Physical Device:**
   - Press Volume Up + Side Button simultaneously
   - Images save to Photos app

2. **Method 2 - Simulator:**
   - Open Xcode Simulator
   - Device → Screenshot (⌘S)
   - Choose save location

3. **Method 3 - TestFlight on Device:**
   - Use your iPhone with TestFlight app
   - Open Archie from TestFlight
   - Take screenshots normally

---

## 🎨 Post-Processing Steps

### Tools Needed:
- **Figma** (recommended) or **Canva** for text overlays
- **Preview** (Mac) for basic editing
- **Photoshop** for advanced editing

### Design Requirements:
- **Background**: Keep original app background (#121820)
- **Text Color**: #FFC300 (golden yellow) for headlines
- **Font**: Inter Bold for headlines, Inter Regular for subtitles
- **Layout**: Text at top and bottom with app content in center
- **Margins**: 60px top/bottom, 40px left/right

### Text Overlay Template:
```
[60px margin]
HEADLINE TEXT (Inter Bold, 32px, #FFC300)
[App Screenshot Content - Don't Cover Important UI]
SUBTITLE TEXT (Inter Regular, 24px, #F5F5F0)
[60px margin]
```

---

## ✅ Quality Checklist

Before submitting screenshots:
- [ ] All text is clearly readable
- [ ] No personal information visible
- [ ] App UI is clean and functional
- [ ] Colors match brand guidelines
- [ ] Text doesn't obstruct important app features
- [ ] All required sizes are created
- [ ] File format is PNG
- [ ] Resolution meets Apple requirements

---

## 🚀 Quick Start Command

**If you have Xcode Simulator:**
```bash
# Open simulator with iPhone 15 Pro Max
xcrun simctl boot "iPhone 15 Pro Max"
open -a Simulator

# Install your app and take screenshots
# Screenshots will be saved to ~/Desktop/
```

**If using TestFlight on your device:**
1. Download Archie from TestFlight
2. Follow screenshot sequence above
3. Transfer images to Mac for editing

---

## 📤 Delivery Format

**File Naming Convention:**
- `archie-screenshot-1-hero-6.7inch.png`
- `archie-screenshot-2-recording-6.7inch.png`
- `archie-screenshot-3-reframing-6.7inch.png`
- `archie-screenshot-4-dashboard-6.7inch.png`
- `archie-screenshot-5-lexicon-6.7inch.png`

**Folder Structure:**
```
screenshots/
  6.7-inch/
    archie-screenshot-1-hero.png
    archie-screenshot-2-recording.png
    ...
  6.5-inch/
    [same files]
  5.5-inch/
    [same files]
```

---

*Create these screenshots first - they're required for App Store submission and can be used across all marketing channels!* 