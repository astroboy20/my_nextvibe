# Requirements Document

## Introduction

NextVibe is a comprehensive mobile event technology platform built on Expo React Native (TypeScript), targeting both iOS (App Store) and Android (Google Play Store). It connects two primary user types — Organizers and Attendees — through event discovery, social photo memories (Postcards), AI-powered gamification, group chat (VibePod), digital watermarking (VibeTag), ticketing with payment processing, and periodic engagement recaps (Monthly Dump, Yearly Wrapped). The platform targets the African market with Paystack/Flutterwave payment integration and a design aesthetic built around a purple/coral color scheme. A single Expo React Native codebase powers both platforms, with all features functioning equivalently on iOS and Android unless a platform-specific constraint applies.

---

## Glossary

- **App**: The NextVibe Expo React Native mobile application
- **Organizer**: A registered user who creates and manages events
- **Attendee**: A registered user who discovers and attends events
- **Auth_Service**: The authentication module handling sign-up, login, and session management
- **Event_Service**: The backend service responsible for creating, updating, and querying events
- **Discovery_Engine**: The module that surfaces events and content to Attendees
- **Event_Page**: The five-tab screen Attendees use to view event details, purchase tickets, play games, create Postcards, and join VibePod
- **Organizer_Dashboard**: The seven-card modular screen Organizers use to manage a live or upcoming event
- **VibeTag**: A proprietary digital watermark embedded into event Postcards to brand them with event identity
- **VibeTag_Studio**: The Organizer tool for creating and customizing VibeTag watermarks
- **Postcard**: A photo or video memory captured by an Attendee during an event, stamped with a VibeTag
- **Postcard_Gallery**: The browsable collection of Postcards associated with an event or user profile
- **VibePod**: The event-specific group chat and attendee matchmaking module
- **DM_Service**: The direct messaging module for one-to-one private conversations
- **VibeTribe**: The social feed showing activity from a user's connections
- **Gamification_Engine**: The module responsible for generating and scoring AI-powered and manual mini-games
- **Game**: One instance of Trivia, Word Puzzle, 2 Truths 1 Lie, or This or That tied to an event
- **Leaderboard**: A ranked list of Attendee scores within an event's Games
- **Ticketing_Service**: The module handling ticket package creation, purchase, and QR code generation
- **Payment_Gateway**: The integration layer connecting to Paystack and Flutterwave
- **QR_Scanner**: The Organizer-side camera module for scanning Attendee QR ticket codes at check-in
- **Notification_Service**: The module delivering push notifications (Firebase/OneSignal) and email (SendGrid)
- **Analytics_Service**: The module aggregating event engagement metrics for Organizer reporting
- **Monthly_Dump**: The automated recap delivered to users on the 1st of each month
- **Yearly_Wrapped**: The cinematic annual recap delivered on December 31
- **Onboarding_Tour**: The guided in-app walkthrough shown to new users after registration
- **Profile**: A user's personal page containing their events, Postcards, game history, rewards, and tribe
- **Interest**: A topic category (e.g., Music, Tech, Sports, Food) selected during onboarding to personalise Discovery_Engine results
- **JWT**: JSON Web Token used for session authentication
- **OAuth_Provider**: Google (required on both platforms) or Apple (required on iOS per App Store guidelines, optional on Android) identity provider used for social sign-in

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a new user, I want to create an account and sign in securely, so that my profile, content, and event history are persisted and protected.

#### Acceptance Criteria

1. THE Auth_Service SHALL support account creation via email and password and Google OAuth on all platforms; on iOS, THE Auth_Service SHALL additionally support Apple OAuth as required by App Store guidelines.
2. WHEN a user submits a registration form with a valid email and password, THE Auth_Service SHALL create a new account and return a JWT within 3 seconds.
3. WHEN a user signs in via an OAuth_Provider, THE Auth_Service SHALL complete the OAuth handshake and return a JWT within 5 seconds.
4. IF a user submits a registration form with an email address that already exists, THEN THE Auth_Service SHALL return an error message identifying the duplicate email.
5. IF a user submits a login request with incorrect credentials, THEN THE Auth_Service SHALL return an authentication failure message without revealing which field is incorrect.
6. WHEN a JWT expires, THE Auth_Service SHALL issue a refreshed token without requiring the user to re-enter credentials.
7. THE Auth_Service SHALL store passwords using a cryptographic hashing algorithm with a unique salt per user.
8. WHEN a user requests a password reset, THE Auth_Service SHALL send a time-limited reset link to the registered email address within 60 seconds.

---

### Requirement 2: Dual-Role Profile Setup

**User Story:** As a new user, I want to select whether I am an Organizer, Attendee, or both, so that the App presents the right tools and views for my use case.

#### Acceptance Criteria

1. WHEN a user completes initial registration, THE App SHALL present a role selection screen offering Organizer, Attendee, and Both options before proceeding.
2. WHEN a user selects a role, THE App SHALL persist that role to the user's Profile and activate the corresponding navigation structure.
3. WHERE a user selects the Both role, THE App SHALL provide access to both Organizer_Dashboard and Attendee navigation paths within a single session.
4. WHEN a user completes role selection, THE App SHALL prompt the user to select at least one Interest from a predefined list.
5. WHEN a user saves Interest selections, THE Discovery_Engine SHALL use those Interests to rank event and content results for that user.
6. THE App SHALL allow a user to change their selected role from the Profile settings at any time after onboarding.

---

### Requirement 3: Onboarding Tour

**User Story:** As a new user, I want a guided walkthrough of the App's key features, so that I understand how to use NextVibe without reading documentation.

#### Acceptance Criteria

1. WHEN a user completes role and Interest selection for the first time, THE Onboarding_Tour SHALL launch automatically and highlight the primary navigation elements relevant to the selected role.
2. THE Onboarding_Tour SHALL complete in no more than 6 steps per role.
3. WHEN a user taps "Skip" at any point, THE Onboarding_Tour SHALL dismiss immediately and mark the tour as completed in the user's Profile.
4. THE App SHALL not display the Onboarding_Tour again to a user whose Profile has the tour marked as completed.
5. WHEN a user completes all steps of the Onboarding_Tour, THE App SHALL navigate the user to the primary home screen for their selected role.

---

### Requirement 4: Event Creation

**User Story:** As an Organizer, I want to create a new event with all relevant details, so that Attendees can discover, RSVP to, and attend the event.

#### Acceptance Criteria

1. WHEN an Organizer submits a new event form with a title, date, time, location, and category, THE Event_Service SHALL create the event record and return its unique identifier within 3 seconds.
2. THE Event_Service SHALL require a title, date, start time, and location for every event before creation.
3. WHEN an Organizer uploads a cover image during event creation, THE App SHALL upload the image to cloud storage and associate the image URL with the event record.
4. IF an Organizer submits an event with a past date, THEN THE Event_Service SHALL return a validation error preventing creation.
5. WHEN an event is created, THE Event_Service SHALL set its default status to Draft, making it invisible to Attendees until the Organizer explicitly publishes it.
6. WHEN an Organizer publishes a Draft event, THE Event_Service SHALL update the event status to Published and make it available to the Discovery_Engine.
7. THE Event_Service SHALL allow an Organizer to edit event details at any time before the event's start time.

---

### Requirement 5: Organizer Dashboard

**User Story:** As an Organizer, I want a single dashboard for each of my events with modular management cards, so that I can control all aspects of an event from one place.

#### Acceptance Criteria

1. WHEN an Organizer navigates to a created event, THE Organizer_Dashboard SHALL display seven management cards: Event Page & Share, RSVP & Ticketing, Gamification Hub, VibeTag Studio, Payment & Activation, Analytics, and Settings.
2. WHEN an Organizer taps the Event Page & Share card, THE Organizer_Dashboard SHALL display the public event URL and a share action that copies the URL or opens the system share sheet.
3. WHEN an Organizer taps the RSVP & Ticketing card, THE Organizer_Dashboard SHALL display the current RSVP count, ticket sales summary, and a navigation entry point to the Ticketing_Service configuration screen.
4. WHEN an Organizer taps the Gamification Hub card, THE Organizer_Dashboard SHALL display existing Games for the event and an option to create a new Game.
5. WHEN an Organizer taps the VibeTag Studio card, THE Organizer_Dashboard SHALL open the VibeTag_Studio for that event.
6. WHEN an Organizer taps the Analytics card, THE Organizer_Dashboard SHALL display the Analytics_Service summary for that event.
7. WHEN an Organizer taps the Settings card, THE Organizer_Dashboard SHALL display event configuration options including visibility, cancellation, and notification preferences.

---

### Requirement 6: Event Discovery

**User Story:** As an Attendee, I want to browse and search for events and content, so that I can find experiences matching my interests and location.

#### Acceptance Criteria

1. WHEN an Attendee opens the Discovery screen, THE Discovery_Engine SHALL display a ranked list of Published events and content within 2 seconds.
2. THE Discovery_Engine SHALL rank results using the Attendee's saved Interests and location as primary signals.
3. WHEN an Attendee switches the Discovery screen toggle to Content mode, THE Discovery_Engine SHALL display a feed of public Postcards and event highlight videos rather than event listings.
4. WHEN an Attendee submits a search query of at least 2 characters, THE Discovery_Engine SHALL return matching events and content within 2 seconds.
5. THE Discovery_Engine SHALL support filtering results by category, date range, and distance from the Attendee's device location.
6. WHEN the Attendee's device location permission is denied, THE Discovery_Engine SHALL fall back to the location set in the user's Profile for ranking and filtering.

---

### Requirement 7: Event Page for Attendees

**User Story:** As an Attendee, I want to view a full event page with multiple tabs, so that I can access all event information, tickets, games, Postcards, and chat in one place.

#### Acceptance Criteria

1. WHEN an Attendee taps an event listing, THE App SHALL navigate to the Event_Page and display five tabs: About, RSVP & Tickets, Games, VibeTag & Postcards, and VibePod Chat.
2. THE Event_Page About tab SHALL display the event title, cover image, date, time, location, description, and Organizer name.
3. WHEN an Attendee taps the RSVP & Tickets tab, THE App SHALL display available ticket packages and a free RSVP option if the event has no paid tickets.
4. WHEN an Attendee taps the Games tab, THE App SHALL display all Games created by the Organizer for that event.
5. WHEN an Attendee taps the VibeTag & Postcards tab, THE App SHALL display the event's Postcard_Gallery and a button to create a new Postcard.
6. WHEN an Attendee taps the VibePod Chat tab, THE App SHALL open the VibePod for that event.

---

### Requirement 8: RSVP System

**User Story:** As an Attendee, I want to RSVP to free events, so that Organizers know I plan to attend and I receive event reminders.

#### Acceptance Criteria

1. WHEN an Attendee taps the RSVP button on a free event, THE Event_Service SHALL record the RSVP and add the event to the Attendee's Profile under My Events within 2 seconds.
2. WHEN an Attendee RSVPs to an event, THE Notification_Service SHALL schedule a push notification reminder 24 hours before the event start time.
3. WHEN an Attendee RSVPs to an event, THE Notification_Service SHALL schedule a second push notification reminder 1 hour before the event start time.
4. WHEN an Attendee cancels an RSVP, THE Event_Service SHALL remove the RSVP record and cancel any pending Notification_Service reminders for that event.
5. THE Event_Service SHALL prevent an Attendee from submitting a duplicate RSVP for the same event.
6. WHEN an Organizer views the RSVP & Ticketing card, THE Organizer_Dashboard SHALL display the total confirmed RSVP count updated within 60 seconds of new RSVPs.

---

### Requirement 9: Ticketing and Payment

**User Story:** As an Organizer, I want to create paid ticket packages for my events and receive payments, so that I can monetise my events and control capacity.

#### Acceptance Criteria

1. WHEN an Organizer creates a ticket package with a name, price, quantity, and description, THE Ticketing_Service SHALL save the package and associate it with the event.
2. THE Ticketing_Service SHALL support creating multiple ticket packages per event with different names and prices.
3. WHEN an Attendee selects a ticket package and completes payment, THE Payment_Gateway SHALL process the transaction via Paystack or Flutterwave within 10 seconds.
4. IF a payment transaction fails, THEN THE Payment_Gateway SHALL return a descriptive failure reason and THE Ticketing_Service SHALL not issue a ticket.
5. WHEN a payment is confirmed, THE Ticketing_Service SHALL generate a unique QR code for the purchased ticket and deliver it to the Attendee within 30 seconds.
6. WHEN the last available ticket in a package is sold, THE Ticketing_Service SHALL mark that package as sold out and prevent further purchases.
7. THE Ticketing_Service SHALL display a running total of revenue collected per event on the Organizer_Dashboard Payment & Activation card.
8. WHEN an Organizer activates payouts, THE Payment_Gateway SHALL initiate a transfer to the Organizer's registered bank account within the payment processor's standard settlement window.

---

### Requirement 10: QR Code Check-in

**User Story:** As an Organizer, I want to scan Attendee QR tickets at the event entrance, so that I can verify attendance quickly and prevent fraudulent entry.

#### Acceptance Criteria

1. WHEN an Organizer opens the QR_Scanner, THE App SHALL request camera permission using the platform-appropriate permission model (Android runtime permissions on Android 10+; NSCameraUsageDescription Info.plist entry on iOS 16+) if not already granted and activate the device camera for QR scanning.
2. WHEN the QR_Scanner reads a valid ticket QR code, THE Ticketing_Service SHALL mark the ticket as checked in and display a confirmation within 2 seconds.
3. IF the QR_Scanner reads a QR code for a ticket that has already been checked in, THEN THE Ticketing_Service SHALL display an already-used error with the original check-in timestamp.
4. IF the QR_Scanner reads a QR code that does not correspond to a valid ticket for the event, THEN THE Ticketing_Service SHALL display an invalid ticket error.
5. WHEN a ticket is checked in, THE Organizer_Dashboard RSVP & Ticketing card SHALL update the attendance count within 60 seconds.

---

### Requirement 11: VibeTag Creation

**User Story:** As an Organizer, I want to create a custom digital watermark for my event, so that all Postcards from the event are branded with my event identity.

#### Acceptance Criteria

1. WHEN an Organizer opens the VibeTag_Studio, THE App SHALL display a canvas for composing a VibeTag from the event name, logo, colour, and optional overlay elements.
2. WHEN an Organizer saves a VibeTag design, THE VibeTag_Studio SHALL store the design and associate it as the active VibeTag for that event.
3. THE Event_Service SHALL allow exactly one active VibeTag per event at any time.
4. WHEN an Organizer updates a VibeTag design after Postcards have already been created, THE App SHALL apply the updated watermark only to new Postcards and preserve the original watermark on existing Postcards.
5. WHEN an Organizer previews the VibeTag, THE VibeTag_Studio SHALL render a sample Postcard showing how the watermark will appear overlaid on a photo.

---

### Requirement 12: Postcard Creation

**User Story:** As an Attendee, I want to take or upload a photo from an event and turn it into a branded Postcard, so that I can preserve and share the memory with the event's identity.

#### Acceptance Criteria

1. WHEN an Attendee taps the create Postcard button on a Published event's VibeTag & Postcards tab, THE App SHALL request camera and photo library permission using the platform-appropriate permission model (Android runtime permissions on Android 10+; NSCameraUsageDescription and NSPhotoLibraryUsageDescription Info.plist entries on iOS 16+) and open the device camera or photo library picker.
2. WHEN an Attendee selects or captures a photo, THE App SHALL overlay the event's active VibeTag watermark on the photo before saving.
3. WHEN an Attendee confirms the Postcard, THE App SHALL upload the watermarked image to cloud storage and add the Postcard to the event's Postcard_Gallery within 5 seconds.
4. THE App SHALL also add the confirmed Postcard to the Attendee's Profile under My Postcards.
5. WHEN an Attendee creates a Postcard, THE App SHALL offer a share action to share the Postcard to external platforms via the device system share sheet.
6. IF an event has no active VibeTag, THEN THE App SHALL still allow Postcard creation with a default NextVibe watermark.

---

### Requirement 13: Postcard Gallery

**User Story:** As an Attendee or Organizer, I want to browse all Postcards from an event, so that I can relive and explore the event's visual memories.

#### Acceptance Criteria

1. WHEN a user opens the Postcard_Gallery for an event, THE App SHALL display all Postcards for that event in a grid layout sorted by creation time, newest first.
2. WHEN a user taps a Postcard in the gallery, THE App SHALL display the full-resolution Postcard with the creator's display name and creation timestamp.
3. THE Postcard_Gallery SHALL load the initial page of up to 24 Postcards within 3 seconds.
4. WHEN a user scrolls to the bottom of the Postcard_Gallery, THE App SHALL load the next page of Postcards without a full screen refresh.
5. WHEN an Organizer views the Postcard_Gallery for their event, THE Organizer_Dashboard SHALL display the total Postcard count on the VibeTag Studio card.

---

### Requirement 14: Gamification — Game Types

**User Story:** As an Organizer, I want to set up interactive mini-games for my event, so that Attendees are engaged and entertained before, during, and after the event.

#### Acceptance Criteria

1. THE Gamification_Engine SHALL support four game types: Trivia, Word Puzzle, 2 Truths 1 Lie, and This or That.
2. WHEN an Organizer creates a Game of type Trivia, THE Gamification_Engine SHALL require at least 3 questions, each with exactly 4 answer options and one correct answer marked.
3. WHEN an Organizer creates a Game of type Word Puzzle, THE Gamification_Engine SHALL require a word or phrase to be hidden and a set of hint clues.
4. WHEN an Organizer creates a Game of type 2 Truths 1 Lie, THE Gamification_Engine SHALL require exactly 3 statements per round with exactly one marked as a lie.
5. WHEN an Organizer creates a Game of type This or That, THE Gamification_Engine SHALL require at least 5 pairs of choices.
6. WHEN an Attendee submits a correct answer in a Game, THE Gamification_Engine SHALL award the Attendee a score based on the game type's scoring rules and record the result.
7. WHEN an Attendee submits an incorrect answer, THE Gamification_Engine SHALL record the attempt and display the correct answer if the game configuration allows reveals.

---

### Requirement 15: AI Game Generation

**User Story:** As an Organizer, I want to auto-generate game content using AI, so that I can create engaging games quickly without writing all questions manually.

#### Acceptance Criteria

1. WHEN an Organizer selects AI Generation for a Game, THE Gamification_Engine SHALL send the event title, category, and description to the OpenAI API and return a complete draft game within 15 seconds.
2. WHEN the AI-generated game draft is returned, THE Gamification_Engine SHALL present each question or prompt to the Organizer for review before saving.
3. THE Gamification_Engine SHALL allow the Organizer to edit, delete, or add items to the AI-generated draft before publishing the Game.
4. IF the OpenAI API returns an error or times out, THEN THE Gamification_Engine SHALL notify the Organizer of the failure and offer manual game creation as a fallback.
5. THE Gamification_Engine SHALL not publish an AI-generated Game without Organizer review and confirmation.

---

### Requirement 16: Leaderboards

**User Story:** As an Attendee, I want to see how I rank against other players in an event's games, so that competition motivates me to engage more.

#### Acceptance Criteria

1. WHEN an Attendee completes a Game, THE Gamification_Engine SHALL update the event Leaderboard with the Attendee's latest score within 5 seconds.
2. WHEN an Attendee views the Leaderboard, THE App SHALL display the top 50 ranked Attendees for the event, sorted by total score descending.
3. THE Leaderboard SHALL display each entry with the Attendee's display name, avatar, and total score.
4. WHEN an Attendee views the Leaderboard, THE App SHALL highlight the Attendee's own ranking position even if it falls outside the top 50.
5. WHEN an Organizer ends a game session, THE Gamification_Engine SHALL freeze the Leaderboard at its final state and store results permanently.

---

### Requirement 17: VibePod Group Chat

**User Story:** As an Attendee, I want to join an event-specific group chat, so that I can interact with other attendees before, during, and after the event.

#### Acceptance Criteria

1. WHEN an Attendee taps the VibePod Chat tab on an Event_Page, THE VibePod SHALL connect to the event's chat room via WebSocket and display message history from the last 100 messages.
2. WHEN an Attendee sends a message in VibePod, THE VibePod SHALL deliver the message to all connected participants within 1 second under normal network conditions.
3. THE VibePod SHALL display each message with the sender's display name, avatar, and timestamp.
4. THE VibePod SHALL support text messages and image sharing.
5. WHEN an Attendee RSVPs or purchases a ticket for an event, THE VibePod SHALL automatically add that Attendee to the event's chat room.
6. WHEN an Attendee is matched with another Attendee in VibePod, THE VibePod SHALL display a match notification with a prompt to connect via DM_Service.
7. IF a WebSocket connection is lost, THEN THE VibePod SHALL attempt reconnection with exponential backoff and display a reconnecting indicator to the user.

---

### Requirement 18: Direct Messaging

**User Story:** As an Attendee, I want to send private messages to other Attendees I meet through VibePod, so that I can build one-to-one connections outside of the group chat.

#### Acceptance Criteria

1. WHEN an Attendee initiates a direct message to another user, THE DM_Service SHALL create a private conversation thread between the two users.
2. WHEN an Attendee sends a message in a DM thread, THE DM_Service SHALL deliver the message to the recipient within 2 seconds under normal network conditions.
3. THE DM_Service SHALL display messages with sender name, avatar, and timestamp.
4. WHEN a user receives a new DM, THE Notification_Service SHALL deliver a push notification within 30 seconds.
5. THE DM_Service SHALL display an unread message badge on the messaging navigation icon showing the count of unread threads.

---

### Requirement 19: VibeTribe Social Feed

**User Story:** As an Attendee, I want a social feed showing my connections' event activity, so that I can stay aware of what events my tribe is attending and creating.

#### Acceptance Criteria

1. WHEN an Attendee opens VibeTribe, THE App SHALL display a feed of activity from the Attendee's connections within 3 seconds.
2. THE VibeTribe feed SHALL include connection RSVPs, new Postcards, game scores, and events attended.
3. WHEN a connection creates a new Postcard, THE VibeTribe feed SHALL surface that Postcard in the Attendee's feed within 60 seconds.
4. THE VibeTribe feed SHALL be sorted by recency, with the most recent activity at the top.
5. WHEN an Attendee taps a feed item, THE App SHALL navigate to the relevant Event_Page, Postcard, or Profile.

---

### Requirement 20: Analytics for Organizers

**User Story:** As an Organizer, I want to view real-time and post-event engagement analytics for my events, so that I can understand audience behaviour and improve future events.

#### Acceptance Criteria

1. WHEN an Organizer opens the Analytics card on the Organizer_Dashboard, THE Analytics_Service SHALL display total RSVP count, ticket sales count, revenue, Postcard count, Game play count, and VibePod message count.
2. THE Analytics_Service SHALL update RSVP and ticket metrics within 60 seconds of new activity.
3. WHEN an event's end time passes, THE Analytics_Service SHALL compile a post-event report and make it available on the Organizer_Dashboard within 2 hours.
4. THE Analytics_Service SHALL display game engagement metrics including total players per Game, average score, and top scorer per Game.
5. WHERE an Organizer has multiple events, THE Analytics_Service SHALL provide a portfolio summary view showing aggregate metrics across all events.

---

### Requirement 21: Push and Email Notifications

**User Story:** As a user, I want timely notifications about my events, messages, and activity, so that I stay informed without needing to open the App constantly.

#### Acceptance Criteria

1. WHEN the App is installed and launched for the first time, THE Notification_Service SHALL request push notification permission from the device on both iOS and Android.
2. WHEN a user grants notification permission, THE Notification_Service SHALL register the device token with the push provider — Firebase Cloud Messaging (FCM) on Android and Apple Push Notification service (APNs) via Firebase or OneSignal on iOS.
3. WHEN a user has granted notification permission and a notification event occurs, THE Notification_Service SHALL deliver the push notification within 30 seconds of the triggering event.
4. WHEN a user's email address is verified, THE Notification_Service SHALL send a confirmation email via SendGrid within 60 seconds of verification.
5. WHEN a ticket purchase is completed, THE Notification_Service SHALL send a booking confirmation email with the QR code attached within 60 seconds.
6. THE App SHALL provide a notification preferences screen where a user can toggle each category of notification on or off independently.
7. IF a user has disabled a notification category, THEN THE Notification_Service SHALL not deliver notifications of that category to that user.

---

### Requirement 22: Monthly Dump

**User Story:** As a user, I want a monthly recap of my event activity, so that I can reflect on the experiences and memories from the past month.

#### Acceptance Criteria

1. WHEN the 1st day of each calendar month begins at 00:00 UTC, THE App SHALL generate and deliver a Monthly_Dump to every user who had event activity in the preceding calendar month.
2. THE Monthly_Dump SHALL include a count of events attended or organised, Postcards created, Games played, and connections made during the preceding month.
3. WHEN a Monthly_Dump is ready, THE Notification_Service SHALL deliver a push notification prompting the user to view it.
4. THE Monthly_Dump SHALL be accessible from the user's Profile for at least 12 months after delivery.
5. IF a user had no event activity in the preceding calendar month, THEN THE App SHALL not generate or deliver a Monthly_Dump for that user.

---

### Requirement 23: Yearly Wrapped

**User Story:** As a user, I want a cinematic annual recap on December 31, so that I can celebrate the year's event highlights in a shareable, memorable format.

#### Acceptance Criteria

1. WHEN December 31 begins at 00:00 UTC, THE App SHALL generate a Yearly_Wrapped for every user who had event activity during the calendar year.
2. THE Yearly_Wrapped SHALL present a sequenced, animated summary of the user's top events, most-viewed Postcards, highest game scores, total connections made, and total events attended or organised during the year.
3. WHEN a Yearly_Wrapped is ready, THE Notification_Service SHALL deliver a push notification prompting the user to view it.
4. WHEN a user views their Yearly_Wrapped, THE App SHALL offer a share action that exports the recap as a video or image for sharing to external platforms.
5. THE Yearly_Wrapped SHALL be accessible from the user's Profile permanently after its first delivery.
6. IF a user had no event activity during the calendar year, THEN THE App SHALL not generate a Yearly_Wrapped for that user.

---

### Requirement 24: Attendee Profile

**User Story:** As an Attendee, I want a personal profile with tabs for my events, Postcards, games, rewards, and tribe, so that I have a single place to review my NextVibe history and social connections.

#### Acceptance Criteria

1. WHEN an Attendee opens their Profile, THE App SHALL display five tabs: My Events, My Postcards, My Games, My Rewards, and My Tribe.
2. THE My Events tab SHALL display all events the Attendee has RSVPd to or purchased tickets for, sorted by event date descending.
3. THE My Postcards tab SHALL display all Postcards created by the Attendee in a grid layout, sorted by creation date descending.
4. THE My Games tab SHALL display a history of all Games played by the Attendee, including game type, event name, score, and date played.
5. THE My Rewards tab SHALL display points or badges earned through game play and event attendance.
6. THE My Tribe tab SHALL display the Attendee's connections list with the option to view each connection's public Profile.
7. WHEN an Attendee views another user's public Profile, THE App SHALL display only the events, Postcards, and stats that user has set to public visibility.

---

### Requirement 25: Dark Mode

**User Story:** As a user, I want the App to respect my device's dark mode setting, so that the interface is comfortable to use in low-light environments.

#### Acceptance Criteria

1. WHEN the device system appearance is set to Dark on iOS (16+) or Android (10+), THE App SHALL render all screens using the dark background (#1E1E2E) and appropriate light foreground colours.
2. WHEN the device system appearance is set to Light on iOS (16+) or Android (10+), THE App SHALL render all screens using the light background (#FFFFFF) and appropriate dark foreground colours.
3. WHEN the device system appearance changes while the App is foregrounded, THE App SHALL switch colour schemes without requiring a restart.
4. THE App SHALL use the primary colour (#6C63FF) and secondary colour (#FF6584) consistently in both light and dark modes.

---

### Requirement 26: Platform Support

**User Story:** As a user, I want the App to be available on both iOS and Android, so that I can use NextVibe regardless of which mobile platform I own.

#### Acceptance Criteria

1. THE App SHALL be available for download on the Apple App Store (iOS 16+) and the Google Play Store (Android 10+, API level 29+).
2. THE App SHALL be built with Expo React Native from a single TypeScript codebase that targets both iOS and Android platforms.
3. WHEN a feature is accessed on either iOS or Android, THE App SHALL deliver equivalent functionality on both platforms unless a documented platform constraint prevents it.
4. WHEN a platform constraint prevents a feature from being available on one platform, THE App SHALL display a clear explanation to the user on that platform rather than silently failing.
5. THE App SHALL support the latest two major OS versions of both iOS and Android at the time of each release.
