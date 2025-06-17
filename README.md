# The Architect - Mobile App

A cross-platform mobile application that empowers users to reshape their reality by transforming their language through voice-powered journaling and AI-guided reframing.

## 🎯 Project Status

### ✅ Completed Features

**Epic 1: Project Setup & Core Structure**
- ✅ Expo project with TypeScript, Expo Router, and dependencies
- ✅ App configuration with icons, splash screen, and plugins
- ✅ Root layout with font loading and navigation structure
- ✅ Tab-based navigation for main app sections
- ✅ Supabase project setup with authentication and database

**Epic 2: Onboarding & Authentication**
- ✅ Aspirational onboarding landing screen
- ✅ Complete authentication system (email/password + OAuth)
- ✅ AI-Assisted Principle Definition UI
- ✅ Interactive lexicon setup with swipeable cards
- ✅ Database integration for saving principles and lexicon words
- ✅ Onboarding completion tracking and navigation flow

**Epic 3: Core UI Screens**
- ✅ Workshop home screen with pulsing orb animation
- ✅ Voice recording functionality
- ✅ Reframe screen UI for transcript and AI summary

**Epic 4: Lexicon Management**
- ✅ Lexicon screen UI with word pairs and stats
- ✅ Database services for lexicon operations

**Epic 5: Dashboard & Progress**
- ✅ Dashboard screen UI with metrics and charts

**Epic 6: Settings & Guide**
- ✅ Guide (Settings) screen with categorized options
- ✅ User sign-out functionality

### 🚧 Next Priority Tasks

**Epic 3: Complete Core Loop**
- ⏳ Task 3.4: AI backend integration for Speech-to-Text
- ⏳ Task 3.5: Connect reframing logic to user's Lexicon data
- ⏳ Task 3.6: AI-generated Guide's Reflection
- ⏳ Task 3.7: Save completed sessions to database

**Epic 4: Enhanced Lexicon**
- ⏳ Task 4.2: Real-time data connection for Lexicon screen
- ⏳ Task 4.3: Add New Word Pair modal
- ⏳ Task 4.4: Save/edit word pairs functionality

## 🏗️ Architecture

### Frontend
- **Framework**: React Native with Expo (SDK 53)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **State Management**: Zustand
- **Styling**: react-native-unistyles with dark theme
- **Authentication**: Supabase Auth with OAuth support

### Backend (BaaS First)
- **Primary**: Supabase (PostgreSQL, Auth, Storage)
- **AI Services**: Custom Python/FastAPI backend (planned)
- **Real-time**: Supabase Realtime subscriptions
- **Security**: Row Level Security (RLS) policies

### Database Schema
- `user_profiles` - Extended user information
- `user_principles` - Core beliefs selected during onboarding
- `user_lexicon` - Personal word transformation pairs
- `journal_sessions` - Completed reframing sessions
- `transformation_usage` - Word usage tracking
- `user_achievements` - Gamification system

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)

### Installation

1. **Clone and install dependencies**
   ```bash
   cd archie
   npm install
   ```

2. **Environment Setup**
   - Supabase credentials are already configured in `app.json`
   - Database schema has been applied and is ready

3. **Run the app**
   ```bash
   npx expo start
   ```

4. **Test the flow**
   - Open on device/simulator
   - Complete the onboarding: Principles → Lexicon Setup
   - Explore the main app tabs

### Development Scripts

```bash
# Start development server
npx expo start

# Run on specific platform
npx expo start --ios
npx expo start --android

# Check project health
npx expo-doctor

# Test database connection
node scripts/test-db.js
```

## 📱 User Flow

1. **Landing Page** - Introduction to The Architect
2. **Authentication** - Email/password or OAuth (Google, Apple, Facebook)
3. **Onboarding**
   - Principle selection (personal beliefs)
   - Lexicon setup (word transformations)
4. **Main App**
   - Workshop: Voice recording and reframing
   - Lexicon: Manage word transformations
   - Dashboard: Progress tracking
   - Guide: Settings and account

## 🎨 Design System

### Colors
- **Background**: `#121820` (primary), `#1F2937` (components)
- **Accent**: `#FFC300` (primary), `#4A90E2` (secondary)
- **Text**: `#F5F5F0` (primary), `#9CA3AF` (secondary)
- **Borders**: `#374151`

### Typography
- **Font**: Inter (Regular, SemiBold, Bold)
- **Sizes**: 32px (titles), 18px (subtitles), 16px (body), 14px (help text)

## 🔐 Security

- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: PostgreSQL Row Level Security (RLS)
- **Data Validation**: Zod schemas on client-side
- **Storage**: Expo SecureStore for session persistence

## 📊 Code Quality

- **TypeScript**: Strict type checking enabled
- **Linting**: ESLint with Airbnb configuration
- **Formatting**: Prettier
- **Architecture**: BaaS First, modular service layer
- **Documentation**: JSDoc comments throughout

## 🤝 Contributing

1. Follow the styling guidelines in `.cursor/rules/styling-guidelines.mdc`
2. Use the established services pattern for database operations
3. Maintain comprehensive logging with Winston
4. Test authentication flows thoroughly
5. Update task completion status in `core-project-requirements.mdc`

## 📄 License

This project is proprietary software for The Architect application.

---

**Current Status**: Core authentication and onboarding flow complete. Ready for AI backend integration and core workshop functionality. 