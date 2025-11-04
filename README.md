# Community Saver — Frontend

A simple React frontend for the Community Saver application.

## Overview
- This repository contains the frontend app built with React and Vite.
- The app is provided as static files and can be served locally or in a container.

## Quick start (developer)
1. Install dependencies:
   ```bash
   npm ci
   ```
2. Start development server:
   ```bash
   npm run dev
   ```

## Run with Docker (recommended for sharing)
1. Build the image:
   ```bash
   docker build -t community-saver-front:latest .
   ```
2. Run the container:
   ```bash
   docker run -d -p 3000:80 --name community-saver-container community-saver-front:latest
   ```
3. If the container name is already used, remove it first:
   ```bash
   docker rm -f community-saver-container
   ```

## Using docker-compose
- Start: `docker-compose up -d --build`
- Stop: `docker-compose down`

If you need the app files instead of a container:
- Build locally: `npm run build`
- The production files will be in the `dist/` folder.

## Need help?
- Share the Docker image or the `dist/` folder with your team.
- Contact the project owner for access or deployment support.

