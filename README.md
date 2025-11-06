# Clarity: A Real-Time AI Call Assistant

**Clarity** is a web-based accessibility tool designed to help users navigate complex or high-pressure phone conversations. It listens to a call in real-time and provides on-screen "Clarity Cards" to help users understand and respond to coercive language, technical jargon, and confusing questions.

This project was built in 24 hours for a technical interview with **Hiya**, demonstrating a rapid, product-focused development cycle using modern AI.

## The Problem

Phone calls can be a source of anxiety and a vector for fraud, especially for vulnerable populations. A user might be:

- **Pressured** by a scammer into a rushed decision.
- **Confused** by a doctor or technician using complex **jargon**.
- **Overwhelmed** by a support agent asking **multi-part questions**.

## The Solution

Clarity listens to the call transcript and uses a generative AI (Google's Gemini) to analyze the _intent_ and _context_ of the conversation. When it detects a "moment of confusion," it provides a simple, actionable card on the user's screen.

### Features

- **Real-Time Transcription:** Uses the browser's native Speech Recognition API to provide a live, on-screen transcript.
- **AI-Powered Analysis (Gemini):** A serverless function analyzes the transcript for three triggers:
  1.  🔴 **Pressure & Coercion:** Detects manipulative language (e.g., "act now," "your account will be locked") and provides a red alert with a suggested response.
  2.  🟡 **Technical Jargon:** Identifies and provides simple, plain-English definitions for complex terms (e.g., "Router," "Premium," "SSN").
  3.  🟡 **Multi-Part Questions:** Senses when the speaker asks multiple questions at once, helping the user ask them to slow down.

## Tech Stack

- **Frontend:** HTML5, CSS3, and vanilla JavaScript (ES6+).
- **Backend:** Vercel Serverless Function (Node.js).
- **AI:** Google Gemini (`gemini-2.5-flash-preview-09-2025`) with JSON schema mode.
- **Speech-to-Text:** Browser-native `SpeechRecognition` API.
- **Hosting:** Vercel.
