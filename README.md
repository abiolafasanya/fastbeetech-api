# Hexonest Server

This is the **server** (backend) application for the FastBeeTech project. It is built with Node.js, TypeScript, and Express, providing RESTful APIs and backend services for the platform.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Docker Usage](#docker-usage)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Node.js + Express REST API
- TypeScript for type safety
- Modular architecture (controllers, models, routes)
- JWT authentication & middleware
- Email sending support
- File uploads
- Blog, analytics, internship, and user modules
- Docker support for containerized deployment

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MongoDB](https://www.mongodb.com/) or your configured database
- (Optional) [Docker](https://www.docker.com/) for containerization

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/abiolafasanya/fastbeetech.git
   cd fastbeetech/server
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env` and fill in the required values (if `.env.example` is not present, ask the project maintainer for required variables).

4. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   The server will start on the port specified in your `.env` file (default: 5000).

## Available Scripts

- `npm run dev` — Start the server in development mode (with nodemon)
- `npm run build` — Compile TypeScript to JavaScript
- `npm start` — Start the server in production mode

## Project Structure

```
server/
├── src/
│   ├── common/         # Shared utilities, middleware, database
│   ├── module/         # Feature modules (blog, user, analytics, etc.)
│   ├── shared/         # Shared resources (email templates, requests)
│   ├── index.ts        # App entry point
│   ├── routes.ts       # Main route definitions
│   └── ...
├── uploads/            # Uploaded files
├── .env                # Environment variables
├── Dockerfile          # Docker configuration
├── package.json        # Project metadata and scripts
└── ...
```

## Environment Variables

- All environment variables should be defined in the `.env` file at the root of the `server` directory.
- Example variables:
  - `PORT` — Port to run the server
  - `MONGODB_URI` — MongoDB connection string
  - `JWT_SECRET` — Secret for JWT authentication
  - `EMAIL_USER`, `EMAIL_PASS` — Email service credentials

## Docker Usage

1. **Build the Docker image:**
   ```bash
   docker build -t fastbeetech-server .
   ```
2. **Run the container:**
   ```bash
   docker run -p 5000:5000 --env-file .env fastbeetech-server
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a pull request

## License

This project is licensed under the MIT License.
