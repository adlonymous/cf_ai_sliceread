# SliceRead - Smart Learning Assistant

A modern web application that allows users to interact with textbooks through an AI-powered chatbot interface. Users can ask questions about textbook content and get intelligent answers with instant access to relevant sections.

## Features

- **Modern UI/UX**: Beautiful, responsive design with glassmorphism effects and smooth animations
- **Textbook Grid**: Browse available textbooks in an elegant card layout
- **AI Chatbot**: Ask questions in natural language and get intelligent responses
- **PDF Viewer**: View relevant textbook sections instantly with integrated PDF viewer
- **Smart Search**: AI-powered search across textbook content
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom components
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **PDF Viewing**: React PDF, PDF.js
- **Backend Integration**: Custom API proxy for worker communication

## Getting Started

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Integration

The app integrates with the worker API through a proxy route (`/api/proxy`) to handle CORS and provide a seamless experience. Make sure the worker is running on `http://localhost:8787` for full functionality.

## Pages

- **Home** (`/`): Textbook grid with modern card layout
- **Textbook Chat** (`/textbook/[slug]`): AI chatbot interface with PDF viewer
- **API Proxy** (`/api/proxy`): Handles communication with worker API

## Components

- **PDF Viewer Modal**: Full-featured PDF viewer with zoom, navigation, and responsive design
- **Chat Interface**: Modern chat bubbles with AI responses and section references
- **Textbook Cards**: Animated cards with hover effects and smooth transitions

## Styling

The app uses a custom design system with:
- Glassmorphism effects
- Gradient backgrounds and text
- Smooth animations and transitions
- Responsive grid layouts
- Modern typography (Inter, Nunito)

## Development

The app is built with Next.js 15 and uses the App Router. All components are client-side with proper TypeScript support and modern React patterns.