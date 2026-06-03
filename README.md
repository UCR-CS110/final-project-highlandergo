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

## Features & Working Status

### Fully Working

- **User Registration & Login** — Create an account with a username, email, and password. Access user registration by navigating to `http://localhost:3000/auth/register` and user login by navigating to `http://localhost:3000/auth/login`
- **Interactive Campus Map** — Leaflet.js map centered on the UCR campus. Access the interactive campus map by navigating to `http://localhost:3000/map`
- **Drop Pins / Add Spots** — Click anywhere on the map to open a form and add a new spot with a title, category, description, and a rating.
- **View Spot Details** — Click any existing pin to see the spot's title, category badge, rating, and description in a popup.
- **Edit & Delete Spots** — Authors can edit or delete their own spots directly from the popup.
- **Search API** — Backend supports a search api (`GET /api/search`).
