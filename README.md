# Highlander GO

Our project is a social network app for UC Riverside students to connect more around campus. Users can drop pins on an interactive map to share and review their favorite spots around campus. Other students will also be able to browse pins, read reviews, and leave reviews of their own on full deployment.

## Tech Stack

- Backend - Node.js, Express
- Database - MongoDB Atlas
- Frontend - HTML, CSS, JavaScript
- Map - Leaflet.js with OpenStreetMap
- Image Hosting - Cloudinary (via multer for upload handling)

## Setup & Running Locally

1. **Prerequisites**
- Node.js
- A MongoDB Atlas account
- A Cloudinary account

2. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd final-project-highlandergo-andres-antonio-khant
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure .env file**

   Copy `.env.example` to `.env` and fill in values according to template

   ```
   ATLAS_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/myDatabase?retryWrites=true&w=majority

   CLOUDINARY_CLOUD_NAME=your_cloud_name_here
   CLOUDINARY_API_KEY=your_api_key_here
   CLOUDINARY_API_SECRET=your_api_secret_here
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Open the app**

   Navigate to `http://localhost:3000` in your browser.

## Features

### Authentication
- **Registration & Login** — Create an account with a username, email, and password. CSRF-protected forms on both `/auth/register` and `/auth/login`.
- **Session-based Auth** — Login sessions stored in MongoDB via `connect-mongo`

### Dashboard
- **Feed** - Displays all reviews created, sorted by most recent
- **Following** - Displays most recent reviews left by users you follow
- **Top Rated** - Displays the highest rated spots
- **Settings** - Routes to your profile for editing your username, bio, or avatar image
- **Map / Add New Spot** - Routes to full map view for adding reviews

### Interactive Map
- **Campus Map** — Leaflet.js map centered on the UCR campus at `/map`
- **Drop Pins** — Click anywhere on the map to open a form and add a new spot
- **View Spot Details** — Click any existing pin to open a sidebar showing the spot's full details, photos, rating, and other reviews
- **Edit & Delete Spots** — Authors can edit or delete their own spots directly

### Reviews & Ratings
- **Post Reviews** — Authenticated users can leave a text review and a rating on any existing spot
- **Delete Reviews** — Authors and admins can delete reviews
- **Live Rating Average** — The spot's average rating updates automatically as reviews are added or removed
- **Photo Uploads** — Spots and reviews support image uploads hosted on Cloudinary

### User Profiles
- **Own Profile** — View and edit your username, avatar, and bio at `/user_profile/profile.html`
- **Public Profiles** — Search and visit any user's public profile to see their profile
- **Following** — Follow other users from their public profile page accessed by searching for their username on the dashboard

### Search
- **Search Users** — Search for other users by username from the dashboard search bar
- **Search Categories** - Search for spots by their category (food/study/other)
- **Search by Name** - Search for spots by their name

### Admin Panel
- **Access Control** — Only admin accounts can reach `/admin`
- **User Management** — View all users, change roles (user/admin), and ban or unban accounts
- **Spot Moderation** — View all spots and delete any post from the admin panel
- **Banned Accounts** — Banned users can still log in but receive a clear error if they attempt to create a spot or post a review
